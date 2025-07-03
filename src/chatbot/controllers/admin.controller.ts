import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ChatbotService } from '../services/chatbot.service';
import { JwtUser } from 'src/auth/interface/jwt-payload.interface';

@Controller('chatbot/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly chatbotService: ChatbotService) {}

  /**
   * Resetear rate limit de un usuario específico (solo para admins)
   */
  @Post('rate-limit/reset/:userId')
  @Roles('SYS', 'ADM')
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
  async getUsageStats(@GetUser() user: JwtUser) {
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
   * Obtener estadísticas de conversaciones por usuario (admins)
   */
  @Get('stats/conversations/:userId')
  @Roles('SYS', 'ADM')
  async getUserConversationStats(@Param('userId') userId: string) {
    try {
      const stats = await this.chatbotService.getUserConversationStats(userId);

      return {
        success: true,
        stats,
        userId,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener estadísticas de conversaciones',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtener temas más consultados por rol (admins)
   */
  @Get('stats/popular-topics')
  @Roles('SYS', 'ADM')
  async getPopularTopics(@GetUser() user: JwtUser) {
    try {
      // Solo SYS puede ver topics de todos los roles
      const roleCode = user.role.code === 'SYS' ? undefined : user.role.code;
      const topics = await this.chatbotService.getPopularTopicsByRole(roleCode);

      return {
        success: true,
        topics,
        scope: roleCode ? `Rol: ${roleCode}` : 'Todos los roles',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener temas populares',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Limpiar sesiones antiguas (solo para admins)
   */
  @Post('cleanup/old-sessions')
  @Roles('SYS')
  async cleanupOldSessions() {
    try {
      const deletedCount = await this.chatbotService.cleanupOldSessions(30);

      return {
        success: true,
        message: `Se eliminaron ${deletedCount} sesiones antiguas`,
        deletedCount,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al limpiar sesiones antiguas',
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
   * Obtener estadísticas del contexto cargado
   */
  @Get('context/stats')
  @Roles('SYS', 'ADM')
  async getContextStats() {
    try {
      const stats = this.chatbotService.getContextStats();

      return {
        success: true,
        contextStats: stats,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener estadísticas del contexto',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Validar la estructura de los contextos
   */
  @Get('context/validate')
  @Roles('SYS')
  async validateContexts() {
    try {
      const validation = this.chatbotService.validateContexts();

      return {
        success: true,
        validation,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al validar contextos',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
