import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { envs } from 'src/config/envs';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { ChatMessage, MessageRole } from '../entities/chat-message.entity';
import { ChatSession } from '../entities/chat-session.entity';
import { ContextService } from './context.service';
import { RateLimitService } from './rate-limit.service';
import { JwtUser } from 'src/auth/interface/jwt-payload.interface';

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
      // 1. Obtener información completa del usuario
      const fullUser = await this.getFullUserInfo(jwtUser.id);

      let session: ChatSession;
      let isNewSession = false;

      if (sessionId) {
        session = await this.getSession(sessionId, jwtUser.id);
      } else {
        session = await this.createSession(fullUser);
        isNewSession = true;
      }

      // 2. Guardar mensaje del usuario
      await this.saveMessage(session, MessageRole.USER, message);

      // 3. Obtener historial limitado
      const conversationHistory = await this.getConversationHistory(session);

      // 4. 🚀 UNA SOLA LLAMADA OPTIMIZADA A CLAUDE
      const smartBotResponse = await this.generateOptimizedResponse(
        message,
        fullUser,
        conversationHistory,
      );

      // 5. Guardar respuesta del asistente
      await this.saveMessage(session, MessageRole.ASSISTANT, smartBotResponse);

      // 6. Incrementar contador de rate limit
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

  /**
   * 🚀 Genera respuesta optimizada con UNA SOLA llamada a Claude
   */
  private async generateOptimizedResponse(
    userMessage: string,
    user: User,
    conversationHistory: string,
  ): Promise<string> {
    try {
      // Validar API key
      if (!envs.claudeApiKey || envs.claudeApiKey.trim() === '') {
        this.logger.error('❌ Claude API key not configured');
        return this.generateFallbackResponse(user.firstName);
      }

      // 🎯 Construir prompt ultra optimizado
      const optimizedPrompt = this.contextService.buildOptimizedPrompt(
        user,
        userMessage,
        conversationHistory,
      );

      // 📊 Log del tamaño del prompt para monitoreo
      this.logger.debug(
        `📏 Optimized prompt size: ${optimizedPrompt.length} chars`,
      );

      // 🔥 Una sola llamada eficiente a Claude
      return await this.callClaudeAPI(optimizedPrompt);
    } catch (error) {
      this.logger.error(
        `❌ Error generating response: ${error.message}`,
        error.stack,
      );
      return this.generateFallbackResponse(user.firstName);
    }
  }

  /**
   * 📞 Llamada optimizada a Claude API
   */
  private async callClaudeAPI(prompt: string): Promise<string> {
    try {
      // Limitar tamaño del prompt si es necesario
      const maxPromptLength = 4000;
      const trimmedPrompt =
        prompt.length > maxPromptLength
          ? prompt.substring(0, maxPromptLength) + '\n[Prompt optimizado]'
          : prompt;

      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-3-haiku-20240307', // Modelo más económico
            max_tokens: 500, // Límite razonable para respuestas
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
            timeout: 25000, // Timeout optimizado
          },
        ),
      );

      if (!response?.data?.content?.[0]?.text) {
        throw new Error('Respuesta inválida de Claude API');
      }

      return response.data.content[0].text;
    } catch (error) {
      this.logger.error(`❌ Claude API Error: ${error.message}`);

      // Log específico para debugging
      if (error.response?.status) {
        this.logger.error(`🔥 API Status: ${error.response.status}`);
      }

      throw error;
    }
  }

  /**
   * 🆘 Respuesta de fallback optimizada
   */
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

  /**
   * 📝 Historial optimizado - solo últimos 3 mensajes
   */
  private async getConversationHistory(session: ChatSession): Promise<string> {
    const messages = await this.chatMessageRepository.find({
      where: { session: { id: session.id } },
      order: { createdAt: 'DESC' },
      take: 3, // Solo últimos 3 mensajes para optimizar
    });

    if (messages.length === 0) return '';

    return messages
      .reverse() // Orden cronológico
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');
  }

  // ========== MÉTODOS EXISTENTES DELEGADOS ==========

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

  async resetUserRateLimit(userId: string): Promise<void> {
    await this.rateLimitService.resetUserRateLimit(userId);
  }

  async getChatbotUsageStats(roleCode?: string): Promise<any> {
    return await this.rateLimitService.getUsageStats(roleCode);
  }

  async getQuickHelpForUser(jwtUser: JwtUser): Promise<string[]> {
    return this.contextService.getQuickHelp(jwtUser.role.code);
  }

  async getStepByStepGuide(guideKey: string, jwtUser: JwtUser): Promise<any> {
    return this.contextService.getStepByStepGuide(guideKey, jwtUser.role.code);
  }

  async searchContextContent(query: string, jwtUser: JwtUser): Promise<any> {
    return this.contextService.searchContextContent(query, jwtUser.role.code);
  }

  getTroubleshootingHelp(issue?: string): any {
    return this.contextService.getTroubleshootingHelp(issue);
  }

  reloadContexts(): void {
    this.contextService.reloadContexts();
  }

  getSystemInfo(): any {
    return this.contextService.getSystemInfo();
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

  async getUserConversationStats(userId: string): Promise<{
    totalSessions: number;
    totalMessages: number;
    averageMessagesPerSession: number;
    lastActivity: Date;
  }> {
    const sessions = await this.chatSessionRepository.find({
      where: { user: { id: userId } },
      relations: ['messages'],
    });

    const totalSessions = sessions.length;
    const totalMessages = sessions.reduce(
      (sum, session) => sum + session.messages.length,
      0,
    );
    const averageMessagesPerSession =
      totalSessions > 0 ? totalMessages / totalSessions : 0;
    const lastActivity =
      sessions.length > 0
        ? new Date(Math.max(...sessions.map((s) => s.updatedAt.getTime())))
        : null;

    return {
      totalSessions,
      totalMessages,
      averageMessagesPerSession:
        Math.round(averageMessagesPerSession * 100) / 100,
      lastActivity,
    };
  }

  async getPopularTopicsByRole(
    roleCode?: string,
  ): Promise<Array<{ topic: string; count: number; percentage: number }>> {
    // Implementación simplificada para optimización
    const queryBuilder = this.chatMessageRepository
      .createQueryBuilder('message')
      .leftJoin('message.session', 'session')
      .leftJoin('session.user', 'user')
      .leftJoin('user.role', 'role')
      .where('message.role = :role', { role: MessageRole.USER });

    if (roleCode) {
      queryBuilder.andWhere('role.code = :roleCode', { roleCode });
    }

    const messages = await queryBuilder.select('message.content').getMany();

    // Análisis básico de temas
    const topics = {
      usuarios: 0,
      leads: 0,
      ventas: 0,
      pagos: 0,
      reportes: 0,
      sistema: 0,
    };

    messages.forEach((msg) => {
      const content = msg.content.toLowerCase();
      if (content.includes('usuario')) topics.usuarios++;
      if (content.includes('lead') || content.includes('cliente'))
        topics.leads++;
      if (content.includes('venta')) topics.ventas++;
      if (content.includes('pago')) topics.pagos++;
      if (content.includes('reporte')) topics.reportes++;
      if (content.includes('sistema')) topics.sistema++;
    });

    const total = messages.length;
    return Object.entries(topics)
      .map(([topic, count]) => ({
        topic,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  async cleanupOldSessions(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.chatSessionRepository
      .createQueryBuilder()
      .delete()
      .where('updatedAt < :cutoffDate', { cutoffDate })
      .andWhere('isActive = false')
      .execute();

    this.logger.log(`🧹 Cleaned up ${result.affected} old sessions`);
    return result.affected || 0;
  }

  getContextStats(): any {
    return this.contextService.getContextStats();
  }

  validateContexts(): any {
    return this.contextService.validateContexts();
  }
}
