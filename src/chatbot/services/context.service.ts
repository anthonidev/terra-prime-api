import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { User } from 'src/user/entities/user.entity';
import {
  baseContextData,
  contextEmojis,
  roleCapabilities,
} from '../context/base-context';
import { rolesContextData } from '../context/roles-context';
import { systemHelpData } from '../context/system-help';

@Injectable()
export class ContextService implements OnModuleInit {
  private readonly logger = new Logger(ContextService.name);
  private baseContext: any;
  private rolesContext: any;
  private systemHelp: any;

  onModuleInit() {
    this.loadContextFiles();
  }

  private loadContextFiles(): void {
    try {
      this.baseContext = baseContextData;
      this.rolesContext = rolesContextData;
      this.systemHelp = systemHelpData;
      this.logger.log('🤖 SmartBot context loaded');
    } catch (error) {
      this.logger.error(`❌ Error loading context: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🎯 Genera prompt optimizado para Claude (una sola llamada)
   */
  buildOptimizedPrompt(
    user: User,
    userMessage: string,
    conversationHistory: string = '',
  ): string {
    const roleCode = user.role.code;
    const roleEmoji = contextEmojis.roles[roleCode] || '⚙️';
    const capabilities = roleCapabilities[roleCode] || roleCapabilities.DEFAULT;

    // Historial limitado solo si existe
    const limitedHistory = conversationHistory
      ? `\nÚltimos mensajes:\n${conversationHistory.split('\n\n').slice(-2).join('\n')}\n`
      : '';

    return `🤖 SmartBot - Asistente de Huertas Inmobiliaria

Usuario: ${user.firstName} ${user.lastName}
${roleEmoji} Rol: ${user.role.name} (${roleCode})
Capacidades: ${capabilities.join(', ')}${limitedHistory}

Consulta: "${userMessage}"

INSTRUCCIONES:
- SIEMPRE usar emojis relevantes
- Si consulta SIMPLE (qué/cómo/dónde/cuándo): máx 150 chars, directo
- Si consulta COMPLEJA (crear/configurar/proceso): detallada con pasos
- Usar "${user.firstName}" cuando sea natural
- Solo info del rol ${roleCode}
- Tono amigable y profesional

Respuesta:`;
  }

  /**
   * 🔍 Busca información relevante para enriquecer el contexto (opcional)
   */
  getRelevantContext(query: string, roleCode: string): string {
    const roleContext =
      this.rolesContext[roleCode] || this.rolesContext.DEFAULT;
    const queryLower = query.toLowerCase();

    // Buscar capacidades relevantes (máximo 2)
    const relevantCaps = roleContext.capabilities
      .filter((cap) =>
        queryLower
          .split(' ')
          .some((word) => word.length > 3 && cap.toLowerCase().includes(word)),
      )
      .slice(0, 2);

    return relevantCaps.length > 0
      ? `\nContexto relevante: ${relevantCaps.join(', ')}`
      : '';
  }

  /**
   * 😊 Obtiene emoji por rol
   */
  getRoleEmoji(roleCode: string): string {
    return contextEmojis.roles[roleCode] || contextEmojis.roles.DEFAULT || '⚙️';
  }

  /**
   * 📋 Construye resumen básico del usuario
   */
  buildUserSummary(user: User): string {
    const roleEmoji = this.getRoleEmoji(user.role.code);
    return `${roleEmoji} ${user.firstName} ${user.lastName} - ${user.role.name}`;
  }

  // ========== MÉTODOS EXISTENTES SIMPLIFICADOS ==========

  getQuickHelp(roleCode: string): string[] {
    return (
      this.systemHelp.quickHelp[roleCode] || this.systemHelp.quickHelp.DEFAULT
    );
  }

  getStepByStepGuide(
    guideKey: string,
    userRoleCode: string,
  ): { title: string; steps: string[] } | null {
    const guide = this.systemHelp.stepByStepGuides[guideKey];
    if (
      !guide ||
      (!guide.applicableRoles.includes(userRoleCode) &&
        !guide.applicableRoles.includes('ALL'))
    ) {
      return null;
    }
    return { title: guide.title, steps: guide.steps };
  }

  getTroubleshootingHelp(
    issue?: string,
  ): Array<{ issue: string; solutions: string[] }> {
    const issues = this.systemHelp.troubleshooting.commonIssues;
    return issue
      ? issues.filter((item) =>
          item.issue.toLowerCase().includes(issue.toLowerCase()),
        )
      : issues;
  }

  searchContextContent(
    query: string,
    roleCode: string,
  ): {
    relevantCapabilities: string[];
    relevantQueries: string[];
    suggestedGuides: Array<{ key: string; title: string }>;
  } {
    const roleContext =
      this.rolesContext[roleCode] || this.rolesContext.DEFAULT;
    const queryLower = query.toLowerCase();

    const relevantCapabilities = roleContext.capabilities
      .filter((cap) => cap.toLowerCase().includes(queryLower))
      .slice(0, 3);

    const relevantQueries = roleContext.commonQueries
      .filter((q) => q.toLowerCase().includes(queryLower))
      .slice(0, 3);

    const suggestedGuides = Object.entries(this.systemHelp.stepByStepGuides)
      .filter(
        ([key, guide]: [string, any]) =>
          (guide.applicableRoles.includes(roleCode) ||
            guide.applicableRoles.includes('ALL')) &&
          guide.title.toLowerCase().includes(queryLower),
      )
      .slice(0, 2)
      .map(([key, guide]: [string, any]) => ({ key, title: guide.title }));

    return { relevantCapabilities, relevantQueries, suggestedGuides };
  }

  reloadContexts(): void {
    this.loadContextFiles();
  }

  getSystemInfo(): any {
    return this.baseContext.system;
  }

  getAllGuides(): any {
    return this.systemHelp.stepByStepGuides;
  }

  getContextStats(): any {
    return {
      totalRoles: Object.keys(this.rolesContext).length,
      totalGuides: Object.keys(this.systemHelp.stepByStepGuides).length,
      totalTroubleshootingIssues:
        this.systemHelp.troubleshooting.commonIssues.length,
      lastLoaded: new Date(),
    };
  }

  validateContexts(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.baseContext?.assistant?.name) {
      errors.push('❌ SmartBot config missing');
    }
    if (!this.rolesContext) {
      errors.push('❌ Roles context missing');
    }
    if (!this.systemHelp) {
      errors.push('❌ System help missing');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}
