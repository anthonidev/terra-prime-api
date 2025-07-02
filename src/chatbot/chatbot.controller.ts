// src/chatbot/controllers/chatbot.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { ActiveUserGuard } from 'src/auth/guards/active-user.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { User } from 'src/user/entities/user.entity';
import { ChatbotService } from './chatbot.service';
import {
  ChatHistoryResponseDto,
  ChatResponseDto,
  SendMessageDto,
} from './dto/chat.dto';
import { ChatbotRateLimitGuard } from './guards/rate-limit.guard';

@Controller('chatbot')
@UseGuards(JwtAuthGuard, ActiveUserGuard)
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  /**
   * Enviar mensaje al chatbot
   */
  @Post('message')
  @UseGuards(ChatbotRateLimitGuard)
  async sendMessage(
    @GetUser() user: User,
    @Body() sendMessageDto: SendMessageDto,
    @Req() request: any,
  ): Promise<ChatResponseDto> {
    try {
      const result = await this.chatbotService.sendMessage(
        user,
        sendMessageDto.message,
        sendMessageDto.sessionId,
      );

      return {
        success: true,
        message: result.isNewSession
          ? 'Nueva conversación iniciada'
          : 'Mensaje enviado exitosamente',
        sessionId: result.sessionId,
        response: result.response,
        timestamp: new Date(),
        rateLimitInfo: request.rateLimitInfo, // Información de rate limit
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al procesar el mensaje',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtener historial de una sesión específica
   */
  @Get('history/:sessionId')
  async getChatHistory(
    @GetUser() user: User,
    @Param('sessionId') sessionId: string,
  ): Promise<ChatHistoryResponseDto> {
    try {
      const messages = await this.chatbotService.getChatHistory(
        sessionId,
        user.id,
      );

      return {
        success: true,
        sessionId,
        messages: messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt,
        })),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener el historial',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtener todas las sesiones del usuario
   */
  @Get('sessions')
  async getUserSessions(@GetUser() user: User) {
    try {
      const sessions = await this.chatbotService.getUserSessions(user.id);

      return {
        success: true,
        sessions: sessions.map((session) => ({
          id: session.id,
          isActive: session.isActive,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        })),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener las sesiones',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Cerrar una sesión de chat
   */
  @Delete('session/:sessionId')
  async closeSession(
    @GetUser() user: User,
    @Param('sessionId') sessionId: string,
  ) {
    try {
      await this.chatbotService.closeSession(sessionId, user.id);

      return {
        success: true,
        message: 'Sesión cerrada exitosamente',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al cerrar la sesión',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtener ayuda rápida personalizada por rol
   */
  @Post('quick-help')
  async getQuickHelp(@GetUser() user: User) {
    try {
      const helpQuestions = this.chatbotService.getQuickHelpForUser(user);

      return {
        success: true,
        help: helpQuestions,
        userRole: {
          code: user.role.code,
          name: user.role.name,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener ayuda rápida',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtener guía paso a paso específica
   */
  @Get('guide/:guideKey')
  async getStepByStepGuide(
    @GetUser() user: User,
    @Param('guideKey') guideKey: string,
  ) {
    try {
      const guide = this.chatbotService.getStepByStepGuide(guideKey, user);

      if (!guide) {
        return {
          success: false,
          message: 'Guía no encontrada o no disponible para tu rol',
        };
      }

      return {
        success: true,
        guide,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener la guía',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Buscar contenido relevante en el contexto
   */
  @Post('search-context')
  async searchContext(
    @GetUser() user: User,
    @Body() { query }: { query: string },
  ) {
    try {
      const results = this.chatbotService.searchContextContent(query, user);

      return {
        success: true,
        query,
        results,
        userRole: {
          code: user.role.code,
          name: user.role.name,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al buscar contenido',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtener ayuda para solución de problemas
   */
  @Get('troubleshooting')
  async getTroubleshooting(
    @GetUser() user: User,
    @Query('issue') issue?: string,
  ) {
    try {
      const troubleshooting = this.chatbotService.getTroubleshootingHelp(issue);

      return {
        success: true,
        troubleshooting,
        filtered: !!issue,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener ayuda de troubleshooting',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtener estado actual del rate limit del usuario
   */
  @Get('rate-limit/status')
  async getRateLimitStatus(@GetUser() user: User) {
    try {
      const status = await this.chatbotService.getUserRateLimitStatus(user.id);

      return {
        success: true,
        rateLimitStatus: status,
        userRole: {
          code: user.role.code,
          name: user.role.name,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener estado de rate limit',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Resetear rate limit de un usuario específico (solo para admins)
   */
  @Post('rate-limit/reset/:userId')
  @Roles('SYS', 'ADM')
  @UseGuards(RolesGuard)
  async resetUserRateLimit(@Param('userId') userId: string) {
    try {
      await this.chatbotService.resetUserRateLimit(userId);

      return {
        success: true,
        message: 'Rate limit reseteado exitosamente',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al resetear rate limit',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtener estadísticas de uso del chatbot (solo para admins)
   */
  @Get('stats/usage')
  @Roles('SYS', 'ADM')
  @UseGuards(RolesGuard)
  async getUsageStats(@GetUser() user: User) {
    try {
      // Solo SYS puede ver stats de todos los roles
      const roleCode = user.role.code === 'SYS' ? undefined : user.role.code;
      const stats = await this.chatbotService.getChatbotUsageStats(roleCode);

      return {
        success: true,
        stats,
        scope: roleCode ? `Rol: ${roleCode}` : 'Todos los roles',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener estadísticas',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Recargar contextos desde archivos JSON (solo para desarrollo)
   */
  @Post('reload-contexts')
  @Roles('SYS')
  @UseGuards(RolesGuard)
  async reloadContexts() {
    try {
      this.chatbotService.reloadContexts();

      return {
        success: true,
        message: 'Contextos recargados exitosamente',
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al recargar contextos',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtener información del sistema (versión, configuración, etc.)
   */
  @Get('system-info')
  async getSystemInfo(@GetUser() user: User) {
    try {
      const systemInfo = this.chatbotService.getSystemInfo();

      return {
        success: true,
        systemInfo,
        userInfo: {
          name: user.fullName,
          email: user.email,
          role: {
            code: user.role.code,
            name: user.role.name,
          },
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener información del sistema',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtener lista de guías disponibles para el rol del usuario
   */
  @Get('available-guides')
  async getAvailableGuides(@GetUser() user: User) {
    try {
      const guides = this.chatbotService.getAvailableGuides(user);

      return {
        success: true,
        guides,
        userRole: {
          code: user.role.code,
          name: user.role.name,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener guías disponibles',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
