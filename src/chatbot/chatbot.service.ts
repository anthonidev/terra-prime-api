import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { User } from 'src/user/entities/user.entity';
import { envs } from 'src/config/envs';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage, MessageRole } from './entities/chat-message.entity';
import { RateLimitService } from './services/rate-limit.service';
import { ContextService } from './services/context.service';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    @InjectRepository(ChatSession)
    private readonly chatSessionRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    private readonly httpService: HttpService,
    private readonly rateLimitService: RateLimitService,
    private readonly contextService: ContextService,
  ) {}

  async sendMessage(
    user: User,
    message: string,
    sessionId?: string,
  ): Promise<{
    sessionId: string;
    response: string;
    isNewSession: boolean;
  }> {
    try {
      let session: ChatSession;
      let isNewSession = false;

      if (sessionId) {
        session = await this.getSession(sessionId, user.id);
      } else {
        session = await this.createSession(user);
        isNewSession = true;
      }

      await this.saveMessage(session, MessageRole.USER, message);

      // 3. Obtener contexto basado en el rol del usuario
      const context = this.contextService.buildUserContext(user);

      // 4. Obtener historial de la conversación
      const conversationHistory = await this.getConversationHistory(session);

      // 5. Generar respuesta con Claude usando contexto mejorado
      const claudeResponse = await this.generateClaudeResponseWithContext(
        message,
        user,
        conversationHistory,
      );

      // 6. Guardar respuesta del asistente
      await this.saveMessage(session, MessageRole.ASSISTANT, claudeResponse);

      // 7. Incrementar contador de rate limit
      await this.rateLimitService.incrementCounter(user);

      return {
        sessionId: session.id,
        response: claudeResponse,
        isNewSession,
      };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`, error.stack);
      throw new BadRequestException('Error al procesar el mensaje');
    }
  }

  /**
   * Crear nueva sesión de chat
   */
  private async createSession(user: User): Promise<ChatSession> {
    const session = this.chatSessionRepository.create({
      user,
      isActive: true,
    });
    return await this.chatSessionRepository.save(session);
  }

  /**
   * Obtener sesión existente y validar acceso
   */
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

  /**
   * Guardar mensaje en la base de datos
   */
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
   * Obtener historial de conversación de una sesión
   */
  private async getConversationHistory(session: ChatSession): Promise<string> {
    const messages = await this.chatMessageRepository.find({
      where: { session: { id: session.id } },
      order: { createdAt: 'ASC' },
      take: 10, // Últimos 10 mensajes para no sobrecargar
    });

    if (messages.length === 0) return '';

    return messages
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');
  }

  /**
   * Generar respuesta usando Claude API con contexto inteligente
   */
  private async generateClaudeResponseWithContext(
    userMessage: string,
    user: User,
    conversationHistory: string,
  ): Promise<string> {
    try {
      // Validar la clave API
      if (!envs.claudeApiKey || envs.claudeApiKey.trim() === '') {
        this.logger.error('Claude API key not configured');
        return this.generateFallbackResponse();
      }

      // 1. Obtener contexto completo del usuario
      const baseContext = this.contextService.buildUserContext(user);

      // 2. Buscar contenido relevante en el contexto
      const contextSearch = this.contextService.searchContextContent(
        userMessage,
        user.role.code,
      );

      // 3. Construir prompt enriquecido pero más conciso
      let enrichedContext = baseContext;

      if (contextSearch.relevantCapabilities.length > 0) {
        enrichedContext += `\n\n=== CAPACIDADES ESPECÍFICAMENTE RELEVANTES ===\n`;
        enrichedContext += contextSearch.relevantCapabilities
          .slice(0, 5) // Limitar a 5 para no hacer el prompt muy largo
          .map((cap) => `• ${cap}`)
          .join('\n');
      }

      if (contextSearch.relevantQueries.length > 0) {
        enrichedContext += `\n\n=== CONSULTAS SIMILARES ===\n`;
        enrichedContext += contextSearch.relevantQueries
          .slice(0, 3) // Limitar a 3
          .map((query) => `• ${query}`)
          .join('\n');
      }

      if (contextSearch.suggestedGuides.length > 0) {
        enrichedContext += `\n\n=== GUÍAS DISPONIBLES ===\n`;
        enrichedContext += contextSearch.suggestedGuides
          .slice(0, 3) // Limitar a 3
          .map((guide) => `• ${guide.title}`)
          .join('\n');
      }

      // Limitar el historial de conversación
      const limitedHistory = conversationHistory
        ? conversationHistory.split('\n\n').slice(-5).join('\n\n') // Últimos 5 intercambios
        : '';

      const prompt = `${enrichedContext}

${limitedHistory ? `\n=== HISTORIAL RECIENTE ===\n${limitedHistory}\n` : ''}

=== CONSULTA ACTUAL ===
Usuario: ${userMessage}

=== INSTRUCCIONES PARA RESPONDER ===
1. Analiza si la consulta está dentro del alcance de las capacidades del rol del usuario
2. Proporciona una respuesta clara, específica y práctica
3. Si hay guías disponibles, menciónalas brevemente
4. Si la consulta está fuera del alcance, explícalo amablemente
5. Mantén un tono profesional pero amigable
6. Usa ejemplos prácticos cuando sea posible
7. Sé conciso pero completo

Asistente:`;

      return await this.callClaudeAPI(prompt);
    } catch (error) {
      this.logger.error(
        `Error generating enhanced response: ${error.message}`,
        error.stack,
      );
      return this.generateFallbackResponse();
    }
  }

  /**
   * Llamar a la API de Claude
   */
  private async callClaudeAPI(prompt: string): Promise<string> {
    try {
      // Validar que el prompt no esté vacío y no sea demasiado largo
      if (!prompt || prompt.trim().length === 0) {
        throw new Error('Prompt vacío');
      }

      // Limitar el tamaño del prompt (Claude tiene límites)
      const maxPromptLength = 50000; // Aproximadamente 50k caracteres
      const trimmedPrompt =
        prompt.length > maxPromptLength
          ? prompt.substring(0, maxPromptLength) +
            '\n[Prompt truncado por longitud]'
          : prompt;

      this.logger.debug(
        `Sending request to Claude API with prompt length: ${trimmedPrompt.length}`,
      );

      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-3-haiku-20240307',
            max_tokens: 1000,
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
            timeout: 30000, // 30 segundos de timeout
          },
        ),
      );

      // Validar la respuesta
      if (!response?.data?.content?.[0]?.text) {
        throw new Error('Respuesta inválida de Claude API');
      }

      return response.data.content[0].text;
    } catch (error) {
      this.logger.error(`Error calling Claude API: ${error.message}`);

      // Log más detalles del error si está disponible
      if (error.response) {
        this.logger.error(
          `Claude API Response Status: ${error.response.status}`,
        );
        this.logger.error(
          `Claude API Response Data: ${JSON.stringify(error.response.data)}`,
        );
      }

      // Si es un error de autenticación o configuración, lanzar error específico
      if (error.response?.status === 401) {
        throw new Error(
          'Error de autenticación con Claude API. Verificar API key.',
        );
      }

      if (error.response?.status === 400) {
        throw new Error(
          'Solicitud inválida a Claude API. Verificar formato del prompt.',
        );
      }

      if (error.response?.status === 429) {
        throw new Error('Límite de rate limit alcanzado en Claude API.');
      }

      // Para otros errores, usar fallback
      throw error;
    }
  }

  /**
   * Generar respuesta de fallback en caso de error
   */
  private generateFallbackResponse(): string {
    return `Lo siento, estoy experimentando dificultades técnicas para conectarme con el servicio de inteligencia artificial en este momento. 

Mientras tanto, puedes:
• Usar la ayuda rápida disponible en el sistema
• Consultar las guías paso a paso
• Contactar al soporte técnico para obtener ayuda inmediata

Por favor, intenta nuevamente en unos minutos.`;
  }

  /**
   * Obtener historial de mensajes de una sesión
   */
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

  /**
   * Obtener todas las sesiones de un usuario
   */
  async getUserSessions(userId: string): Promise<ChatSession[]> {
    return await this.chatSessionRepository.find({
      where: { user: { id: userId }, isActive: true },
      order: { updatedAt: 'DESC' },
      take: 10, // Últimas 10 sesiones
    });
  }

  /**
   * Cerrar sesión de chat
   */
  async closeSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.getSession(sessionId, userId);
    session.isActive = false;
    await this.chatSessionRepository.save(session);
  }

  /**
   * Obtener estado de rate limit del usuario
   */
  async getUserRateLimitStatus(userId: string): Promise<any> {
    const user = await this.chatSessionRepository.manager.findOne(User, {
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    return await this.rateLimitService.getRateLimitStatus(user);
  }

  /**
   * Resetear rate limit de un usuario
   */
  async resetUserRateLimit(userId: string): Promise<void> {
    await this.rateLimitService.resetUserRateLimit(userId);
  }

  /**
   * Obtener estadísticas de uso del chatbot
   */
  async getChatbotUsageStats(roleCode?: string): Promise<any> {
    return await this.rateLimitService.getUsageStats(roleCode);
  }

  // ========== MÉTODOS PARA TRABAJAR CON CONTEXTO ==========

  /**
   * Obtener ayuda rápida para el rol del usuario
   */
  getQuickHelpForUser(user: User): string[] {
    return this.contextService.getQuickHelp(user.role.code);
  }

  /**
   * Obtener guía paso a paso específica
   */
  getStepByStepGuide(guideKey: string, user: User): any {
    return this.contextService.getStepByStepGuide(guideKey, user.role.code);
  }

  /**
   * Buscar contenido relevante en el contexto
   */
  searchContextContent(query: string, user: User): any {
    return this.contextService.searchContextContent(query, user.role.code);
  }

  /**
   * Obtener ayuda para solución de problemas
   */
  getTroubleshootingHelp(issue?: string): any {
    return this.contextService.getTroubleshootingHelp(issue);
  }

  /**
   * Recargar contextos desde archivos (solo para desarrollo)
   */
  reloadContexts(): void {
    this.contextService.reloadContexts();
  }

  /**
   * Obtener información del sistema
   */
  getSystemInfo(): any {
    return this.contextService.getSystemInfo();
  }

  /**
   * Obtener guías disponibles para el rol del usuario
   */
  getAvailableGuides(
    user: User,
  ): Array<{ key: string; title: string; description?: string }> {
    // Obtener todas las guías del sistema
    const allGuides = this.contextService.getAllGuides();

    // Filtrar las guías disponibles para el rol del usuario
    return Object.entries(allGuides)
      .filter(
        ([key, guide]) =>
          guide.applicableRoles.includes(user.role.code) ||
          guide.applicableRoles.includes('ALL'),
      )
      .map(([key, guide]) => ({
        key,
        title: guide.title,
        description:
          guide.description ||
          `Guía paso a paso para ${guide.title.toLowerCase()}`,
      }));
  }

  // ========== MÉTODOS ADICIONALES PARA ANÁLISIS ==========

  /**
   * Obtener estadísticas de conversaciones por usuario
   */
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

  /**
   * Obtener temas más consultados por rol
   */
  async getPopularTopicsByRole(roleCode?: string): Promise<
    Array<{
      topic: string;
      count: number;
      percentage: number;
    }>
  > {
    // Esta es una implementación simplificada
    // En una implementación real, podrías usar análisis de texto más sofisticado
    const queryBuilder = this.chatMessageRepository
      .createQueryBuilder('message')
      .leftJoin('message.session', 'session')
      .leftJoin('session.user', 'user')
      .leftJoin('user.role', 'role')
      .where('message.role = :role', { role: MessageRole.USER });

    if (roleCode) {
      queryBuilder.andWhere('role.code = :roleCode', { roleCode });
    }

    const messages = await queryBuilder.getMany();

    // Análisis básico de palabras clave comunes
    const topicKeywords = {
      usuarios: ['usuario', 'crear usuario', 'nuevo usuario'],
      leads: ['lead', 'prospecto', 'cliente'],
      ventas: ['venta', 'vender', 'cotización'],
      pagos: ['pago', 'cobranza', 'factura'],
      reportes: ['reporte', 'estadística', 'análisis'],
      sistema: ['sistema', 'configuración', 'ayuda'],
    };

    const topicCounts = {};
    let totalMessages = messages.length;

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      topicCounts[topic] = messages.filter((message) =>
        keywords.some((keyword) =>
          message.content.toLowerCase().includes(keyword.toLowerCase()),
        ),
      ).length;
    });

    return Object.entries(topicCounts)
      .map(([topic, count]) => ({
        topic,
        count: count as number,
        percentage:
          totalMessages > 0
            ? Math.round(((count as number) / totalMessages) * 100)
            : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Limpiar sesiones inactivas antiguas
   */
  async cleanupOldSessions(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.chatSessionRepository
      .createQueryBuilder()
      .delete()
      .where('updatedAt < :cutoffDate', { cutoffDate })
      .andWhere('isActive = false')
      .execute();

    this.logger.log(`Cleaned up ${result.affected} old chat sessions`);
    return result.affected || 0;
  }
}
