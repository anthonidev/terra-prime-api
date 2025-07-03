import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { JwtUser } from 'src/auth/interface/jwt-payload.interface';
import { envs } from 'src/config/envs';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { ChatMessage, MessageRole } from '../entities/chat-message.entity';
import { ChatSession } from '../entities/chat-session.entity';
import { ContextService } from './context.service';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    @InjectRepository(ChatSession)
    private readonly chatSessionRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly httpService: HttpService,
    private readonly rateLimitService: RateLimitService,
    private readonly contextService: ContextService,
  ) {}

  async sendMessage(
    jwtUser: JwtUser,
    message: string,
    sessionId?: string,
  ): Promise<{
    sessionId: string;
    response: string;
    isNewSession: boolean;
  }> {
    try {
      const fullUser = await this.getFullUserInfo(jwtUser.id);

      let session: ChatSession;
      let isNewSession = false;

      if (sessionId) {
        session = await this.getSession(sessionId, jwtUser.id);
      } else {
        session = await this.createSession(fullUser);
        isNewSession = true;
      }

      await this.saveMessage(session, MessageRole.USER, message);

      const conversationHistory = await this.getConversationHistory(session);

      const smartBotResponse = await this.generateOptimizedResponse(
        message,
        fullUser,
        conversationHistory,
      );

      await this.saveMessage(session, MessageRole.ASSISTANT, smartBotResponse);

      await this.rateLimitService.incrementCounter(fullUser);

      return {
        sessionId: session.id,
        response: smartBotResponse,
        isNewSession,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error sending message: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Error al procesar el mensaje');
    }
  }

  private async generateOptimizedResponse(
    userMessage: string,
    user: User,
    conversationHistory: string,
  ): Promise<string> {
    try {
      if (!envs.claudeApiKey || envs.claudeApiKey.trim() === '') {
        return this.generateFallbackResponse(user.firstName);
      }

      const optimizedPrompt = this.contextService.buildOptimizedPrompt(
        user,
        userMessage,
        conversationHistory,
      );

      this.logger.debug(
        `📏 Optimized prompt size: ${optimizedPrompt.length} chars`,
      );

      return await this.callClaudeAPI(optimizedPrompt);
    } catch (error) {
      this.logger.error(
        `❌ Error generating response: ${error.message}`,
        error.stack,
      );
      return this.generateFallbackResponse(user.firstName);
    }
  }

  private async callClaudeAPI(prompt: string): Promise<string> {
    try {
      const maxPromptLength = 4000;
      const trimmedPrompt =
        prompt.length > maxPromptLength
          ? prompt.substring(0, maxPromptLength) + '\n[Prompt optimizado]'
          : prompt;

      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-3-haiku-20240307',
            max_tokens: 500,
            messages: [
              {
                role: 'user',
                content: trimmedPrompt,
              },
            ],
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': envs.claudeApiKey,
              'anthropic-version': '2023-06-01',
            },
            timeout: 25000,
          },
        ),
      );

      if (!response?.data?.content?.[0]?.text) {
        throw new Error('Respuesta inválida de Claude API');
      }

      return response.data.content[0].text;
    } catch (error) {
      this.logger.error(`❌ Claude API Error: ${error.message}`);

      if (error.response?.status) {
        this.logger.error(`🔥 API Status: ${error.response.status}`);
      }

      throw error;
    }
  }

  private generateFallbackResponse(firstName: string): string {
    return `🤖 Lo siento ${firstName}, estoy experimentando dificultades técnicas. 

⚡ Mientras tanto puedes:
• 📚 Consultar las guías del sistema
• 🆘 Contactar al soporte técnico
• 🔄 Intentar en unos minutos

¡Gracias por tu paciencia! 😊`;
  }

  // ========== MÉTODOS AUXILIARES SIN CAMBIOS ==========

  private async getFullUserInfo(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'document',
        'photo',
        'isActive',
        'createdAt',
        'updatedAt',
        'lastLoginAt',
      ],
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    return user;
  }

  private async createSession(user: User): Promise<ChatSession> {
    const session = this.chatSessionRepository.create({
      user,
      isActive: true,
    });
    return await this.chatSessionRepository.save(session);
  }

  private async getSession(
    sessionId: string,
    userId: string,
  ): Promise<ChatSession> {
    const session = await this.chatSessionRepository.findOne({
      where: { id: sessionId, user: { id: userId }, isActive: true },
      relations: ['user'],
    });

    if (!session) {
      throw new BadRequestException('Sesión no encontrada o no válida');
    }

    return session;
  }

  private async saveMessage(
    session: ChatSession,
    role: MessageRole,
    content: string,
  ): Promise<ChatMessage> {
    const message = this.chatMessageRepository.create({
      session,
      role,
      content,
    });
    return await this.chatMessageRepository.save(message);
  }

  private async getConversationHistory(session: ChatSession): Promise<string> {
    const messages = await this.chatMessageRepository.find({
      where: { session: { id: session.id } },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    if (messages.length === 0) return '';

    return messages
      .reverse()
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');
  }

  async getChatHistory(
    sessionId: string,
    userId: string,
  ): Promise<ChatMessage[]> {
    const session = await this.getSession(sessionId, userId);
    return await this.chatMessageRepository.find({
      where: { session: { id: session.id } },
      order: { createdAt: 'ASC' },
    });
  }

  async getUserSessions(userId: string): Promise<ChatSession[]> {
    return await this.chatSessionRepository.find({
      where: { user: { id: userId }, isActive: true },
      order: { updatedAt: 'DESC' },
      take: 10,
    });
  }

  async closeSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.getSession(sessionId, userId);
    session.isActive = false;
    await this.chatSessionRepository.save(session);
  }

  async getUserRateLimitStatus(userId: string): Promise<any> {
    const user = await this.getFullUserInfo(userId);
    return await this.rateLimitService.getRateLimitStatus(user);
  }

  reloadContexts(): void {
    this.contextService.reloadContexts();
  }

  async getAvailableGuides(
    jwtUser: JwtUser,
  ): Promise<Array<{ key: string; title: string; description?: string }>> {
    const allGuides = this.contextService.getAllGuides();
    return Object.entries(allGuides)
      .filter(
        ([key, guide]: [string, any]) =>
          guide.applicableRoles.includes(jwtUser.role.code) ||
          guide.applicableRoles.includes('ALL'),
      )
      .map(([key, guide]: [string, any]) => ({
        key,
        title: guide.title,
        description:
          guide.description || `Guía para ${guide.title.toLowerCase()}`,
      }));
  }
}
