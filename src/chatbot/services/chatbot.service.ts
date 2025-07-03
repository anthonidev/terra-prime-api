import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtUser } from 'src/auth/interface/jwt-payload.interface';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { ChatMessage, MessageRole } from '../entities/chat-message.entity';
import { ChatSession } from '../entities/chat-session.entity';
import { RoleAgentFactory } from '../factories/role-agent.factory';
import { RateLimitService } from './rate-limit.service';
import { SessionTitleService } from './title.service';

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
    private readonly rateLimitService: RateLimitService,
    private readonly roleAgentFactory: RoleAgentFactory,
    private readonly sessionTitleService: SessionTitleService,
  ) {}

  async sendMessage(
    jwtUser: JwtUser,
    message: string,
    sessionId?: string,
  ): Promise<{
    sessionId: string;
    response: string;
    isNewSession: boolean;
    metadata?: any;
  }> {
    try {
      const fullUser = await this.getFullUserInfo(jwtUser.id);

      let session: ChatSession;
      let isNewSession = false;

      if (sessionId) {
        session = await this.getSession(sessionId, jwtUser.id);
      } else {
        // Crear nueva sesión con título automático
        const title = await this.sessionTitleService.generateTitle(
          message,
          fullUser.role.code,
        );
        session = await this.createSession(fullUser, title);
        isNewSession = true;
      }

      // Guardar mensaje del usuario
      await this.saveMessage(session, MessageRole.USER, message);

      // Obtener historial de conversación
      const conversationHistory = await this.getConversationHistory(session);

      // Procesar mensaje con agente específico del rol
      const roleAgent = this.roleAgentFactory.getAgentForRole(
        fullUser.role.code,
      );

      const agentResponse = await roleAgent.processMessage({
        user: fullUser,
        message,
        conversationHistory,
        sessionId: session.id,
      });

      // Guardar respuesta del asistente
      await this.saveMessage(
        session,
        MessageRole.ASSISTANT,
        agentResponse.content,
      );

      // Incrementar contador de rate limit
      await this.rateLimitService.incrementCounter(fullUser);

      this.logger.log(
        `✅ Message processed for user ${fullUser.firstName} (${fullUser.role.code}) in session ${session.id}`,
      );

      return {
        sessionId: session.id,
        response: agentResponse.content,
        isNewSession,
        metadata: agentResponse.metadata,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error sending message: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Error al procesar el mensaje');
    }
  }

  // ========== MÉTODOS PARA GESTIÓN DE SESIONES ==========

  private async createSession(user: User, title: string): Promise<ChatSession> {
    const session = this.chatSessionRepository.create({
      user,
      title,
      isActive: true,
    });

    const savedSession = await this.chatSessionRepository.save(session);
    this.logger.debug(
      `📝 Created new session: "${title}" for user ${user.firstName}`,
    );

    return savedSession;
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

  async updateSessionTitle(
    sessionId: string,
    userId: string,
    newTitle: string,
  ): Promise<ChatSession> {
    const session = await this.getSession(sessionId, userId);
    session.title = newTitle.slice(0, 200); // Limitar a 200 caracteres

    const updatedSession = await this.chatSessionRepository.save(session);
    this.logger.log(
      `📝 Updated session title: "${newTitle}" for session ${sessionId}`,
    );

    return updatedSession;
  }

  // ========== MÉTODOS PARA GESTIÓN DE MENSAJES ==========

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
      take: 10, // Últimos 10 mensajes
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

  // ========== MÉTODOS PARA GESTIÓN DE USUARIOS ==========

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

  // ========== MÉTODOS PÚBLICOS PARA FRONTEND ==========

  async getUserSessions(userId: string): Promise<
    Array<{
      id: string;
      title: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      messageCount: number;
    }>
  > {
    const sessions = await this.chatSessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.messages', 'message')
      .where('session.user.id = :userId', { userId })
      .andWhere('session.isActive = :isActive', { isActive: true })
      .orderBy('session.updatedAt', 'DESC')
      .take(20) // Últimas 20 sesiones
      .getMany();

    return sessions.map((session) => ({
      id: session.id,
      title: session.title,
      isActive: session.isActive,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: session.messages?.length || 0,
    }));
  }

  async closeSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.getSession(sessionId, userId);
    session.isActive = false;
    await this.chatSessionRepository.save(session);

    this.logger.log(`🔒 Closed session ${sessionId} for user ${userId}`);
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.getSession(sessionId, userId);

    // Eliminar todos los mensajes de la sesión
    await this.chatMessageRepository.delete({ session: { id: session.id } });

    // Eliminar la sesión
    await this.chatSessionRepository.delete({ id: session.id });

    this.logger.log(`🗑️ Deleted session ${sessionId} for user ${userId}`);
  }

  // ========== MÉTODOS PARA RATE LIMITING ==========

  async getUserRateLimitStatus(userId: string): Promise<any> {
    const user = await this.getFullUserInfo(userId);
    return await this.rateLimitService.getRateLimitStatus(user);
  }

  // ========== MÉTODOS PARA INFORMACIÓN DEL SISTEMA ==========

  async getAvailableGuides(
    jwtUser: JwtUser,
  ): Promise<Array<{ key: string; title: string; description?: string }>> {
    // Este método puede ser movido a un servicio específico de ayuda
    const roleAgent = this.roleAgentFactory.getAgentForRole(jwtUser.role.code);
    const capabilities = this.roleAgentFactory.getAgentCapabilities(
      jwtUser.role.code,
    );

    return capabilities.map((capability, index) => ({
      key: `guide_${index}`,
      title: capability,
      description: `Guía para ${capability.toLowerCase()}`,
    }));
  }

  getSystemStats(): {
    availableRoles: string[];
    hasClaudeApi: boolean;
    activeAgents: number;
  } {
    return {
      availableRoles: this.roleAgentFactory.getAvailableRoles(),
      hasClaudeApi: true, // Se puede verificar desde ClaudeApiService
      activeAgents: this.roleAgentFactory.getAvailableRoles().length,
    };
  }
}
