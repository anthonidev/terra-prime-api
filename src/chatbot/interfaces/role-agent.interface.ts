import { User } from 'src/user/entities/user.entity';

export interface RoleAgentResponse {
  content: string;
  metadata?: {
    needsGuide?: boolean;
    suggestedActions?: string[];
    relatedFeatures?: string[];
  };
}

export interface AgentContext {
  user: User;
  message: string;
  conversationHistory: string;
  sessionId: string;
}

export abstract class BaseRoleAgent {
  protected readonly roleName: string;
  protected readonly capabilities: string[];
  protected readonly commonQueries: string[];

  constructor(roleName: string) {
    this.roleName = roleName;
    this.capabilities = this.getCapabilities();
    this.commonQueries = this.getCommonQueries();
  }

  abstract processMessage(context: AgentContext): Promise<RoleAgentResponse>;

  protected abstract getCapabilities(): string[];
  protected abstract getCommonQueries(): string[];
  protected abstract getContextualPrompt(context: AgentContext): string;

  protected generateFallbackResponse(firstName: string): RoleAgentResponse {
    return {
      content: `🤖 Lo siento ${firstName}, estoy experimentando dificultades técnicas. 

⚡ Mientras tanto puedes:
• 📚 Consultar las guías del sistema
• 🆘 Contactar al soporte técnico
• 🔄 Intentar en unos minutos

¡Gracias por tu paciencia! 😊`,
      metadata: {
        needsGuide: true,
        suggestedActions: [
          'Consultar guías',
          'Contactar soporte',
          'Reintentar',
        ],
      },
    };
  }

  protected findRelevantCapability(message: string): string | null {
    const messageLower = message.toLowerCase();
    return (
      this.capabilities.find((cap) =>
        messageLower.includes(cap.toLowerCase().split(' ')[0]),
      ) || null
    );
  }

  protected isSimpleQuery(message: string): boolean {
    const simplePatterns = [
      /^(qué|cómo|dónde|cuándo|quién)/i,
      /\?$/,
      message.length < 50,
    ];

    return simplePatterns.some((pattern) =>
      typeof pattern === 'boolean' ? pattern : pattern.test(message),
    );
  }
}
