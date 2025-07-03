import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { User } from 'src/user/entities/user.entity';
import {
  ChatHistoryResponseDto,
  ChatResponseDto,
  SendMessageDto,
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
        rateLimitInfo: request.rateLimitInfo,
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
}
