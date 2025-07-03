import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { JwtUser } from 'src/auth/interface/jwt-payload.interface';
import {
  ChatHistoryResponseDto,
  ChatResponseDto,
  SendMessageDto,
  SessionListResponseDto,
  UpdateSessionTitleDto,
} from '../dto/chat.dto';
import { ChatbotRateLimitGuard } from '../guards/rate-limit.guard';
import { ChatbotService } from '../services/chatbot.service';

@Controller('chatbot/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatbotService: ChatbotService) {}

  /**
   * Enviar mensaje al chatbot
   */
  @Post('message')
  @UseGuards(ChatbotRateLimitGuard)
  async sendMessage(
    @GetUser() user: JwtUser,
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
        rateLimitInfo: request.rateLimitInfo,
        metadata: result.metadata,
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
    @GetUser() user: JwtUser,
    @Param('sessionId') sessionId: string,
  ): Promise<ChatHistoryResponseDto> {
    try {
      const messages = await this.chatbotService.getChatHistory(
        sessionId,
        user.id,
      );

      // Obtener información de la sesión para incluir el título
      const sessions = await this.chatbotService.getUserSessions(user.id);
      const currentSession = sessions.find((s) => s.id === sessionId);

      return {
        success: true,
        sessionId,
        title: currentSession?.title || 'Conversación',
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
  async getUserSessions(
    @GetUser() user: JwtUser,
  ): Promise<SessionListResponseDto> {
    try {
      const sessions = await this.chatbotService.getUserSessions(user.id);

      return {
        success: true,
        sessions,
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
   * Actualizar título de una sesión
   */
  @Patch('session/:sessionId/title')
  async updateSessionTitle(
    @GetUser() user: JwtUser,
    @Param('sessionId') sessionId: string,
    @Body() updateTitleDto: UpdateSessionTitleDto,
  ) {
    try {
      await this.chatbotService.updateSessionTitle(
        sessionId,
        user.id,
        updateTitleDto.title,
      );

      return {
        success: true,
        message: 'Título actualizado exitosamente',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al actualizar el título',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Cerrar una sesión de chat
   */
  @Patch('session/:sessionId/close')
  async closeSession(
    @GetUser() user: JwtUser,
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
   * Eliminar una sesión de chat
   */
  @Delete('session/:sessionId')
  async deleteSession(
    @GetUser() user: JwtUser,
    @Param('sessionId') sessionId: string,
  ) {
    try {
      await this.chatbotService.deleteSession(sessionId, user.id);

      return {
        success: true,
        message: 'Sesión eliminada exitosamente',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al eliminar la sesión',
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
  async getRateLimitStatus(@GetUser() user: JwtUser) {
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
   * Obtener estadísticas del sistema de chatbot
   */
  @Get('system/stats')
  async getSystemStats(@GetUser() user: JwtUser) {
    try {
      const stats = this.chatbotService.getSystemStats();

      return {
        success: true,
        stats,
        userRole: user.role.code,
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
}
