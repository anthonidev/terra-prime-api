import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { User } from 'src/user/entities/user.entity';

interface BaseContext {
  system: {
    name: string;
    description: string;
    version: string;
  };
  assistant: {
    name: string;
    personality: string;
    tone: string;
    language: string;
  };
  baseInstructions: string[];
  limitations: string[];
}

interface RoleContext {
  name: string;
  description: string;
  capabilities: string[];
  commonQueries: string[];
  workflows: string[];
}

interface SystemHelp {
  quickHelp: Record<string, string[]>;
  stepByStepGuides: Record<
    string,
    {
      title: string;
      applicableRoles: string[];
      steps: string[];
    }
  >;
  troubleshooting: {
    commonIssues: Array<{
      issue: string;
      solutions: string[];
    }>;
  };
}

@Injectable()
export class ContextService implements OnModuleInit {
  private readonly logger = new Logger(ContextService.name);
  private baseContext: BaseContext;
  private rolesContext: Record<string, RoleContext>;
  private systemHelp: SystemHelp;

  onModuleInit() {
    this.loadContextFiles();
  }

  private loadContextFiles(): void {
    try {
      const contextPath = join(process.cwd(), 'src', 'chatbot', 'context');

      // Cargar contexto base
      const baseContextPath = join(contextPath, 'base-context.json');
      this.baseContext = JSON.parse(readFileSync(baseContextPath, 'utf8'));

      // Cargar contexto de roles
      const rolesContextPath = join(contextPath, 'roles-context.json');
      this.rolesContext = JSON.parse(readFileSync(rolesContextPath, 'utf8'));

      // Cargar ayuda del sistema
      const systemHelpPath = join(contextPath, 'system-help.json');
      this.systemHelp = JSON.parse(readFileSync(systemHelpPath, 'utf8'));

      this.logger.log('Context files loaded successfully');
    } catch (error) {
      this.logger.error(`Error loading context files: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera el contexto completo para un usuario específico
   */
  buildUserContext(user: User): string {
    const roleCode = user.role.code;
    const roleContext =
      this.rolesContext[roleCode] || this.rolesContext.DEFAULT;

    const context = `
${this.baseContext.assistant.name} - Sistema ${this.baseContext.system.name}

=== INFORMACIÓN DEL USUARIO ===
- Nombre: ${user.fullName}
- Email: ${user.email}
- Rol: ${roleContext.name} (${roleCode})

=== INSTRUCCIONES BASE ===
${this.baseContext.baseInstructions.map((instruction) => `• ${instruction}`).join('\n')}

=== LIMITACIONES ===
${this.baseContext.limitations.map((limitation) => `• ${limitation}`).join('\n')}

=== CAPACIDADES DE TU ROL (${roleContext.name}) ===
${roleContext.description}

Puedes ayudar con:
${roleContext.capabilities.map((capability) => `• ${capability}`).join('\n')}

=== CONSULTAS FRECUENTES PARA TU ROL ===
${roleContext.commonQueries.map((query) => `• ${query}`).join('\n')}

=== FLUJOS DE TRABAJO TÍPICOS ===
${roleContext.workflows.map((workflow) => `• ${workflow}`).join('\n')}

=== PERSONALIDAD DEL ASISTENTE ===
- Personalidad: ${this.baseContext.assistant.personality}
- Tono: ${this.baseContext.assistant.tone}
- Idioma: ${this.baseContext.assistant.language}

IMPORTANTE: Responde siempre en español, mantén un tono ${this.baseContext.assistant.tone}, y enfócate únicamente en las capacidades de su rol.
`;

    return context;
  }

  /**
   * Obtiene ayuda rápida para un rol específico
   */
  getQuickHelp(roleCode: string): string[] {
    return (
      this.systemHelp.quickHelp[roleCode] || this.systemHelp.quickHelp.DEFAULT
    );
  }

  /**
   * Obtiene una guía paso a paso si está disponible para el rol
   */
  getStepByStepGuide(
    guideKey: string,
    userRoleCode: string,
  ): {
    title: string;
    steps: string[];
  } | null {
    const guide = this.systemHelp.stepByStepGuides[guideKey];

    if (!guide) return null;

    // Verificar si el rol del usuario puede acceder a esta guía
    if (
      !guide.applicableRoles.includes(userRoleCode) &&
      !guide.applicableRoles.includes('ALL')
    ) {
      return null;
    }

    return {
      title: guide.title,
      steps: guide.steps,
    };
  }

  /**
   * Obtiene soluciones para problemas comunes
   */
  getTroubleshootingHelp(issue?: string): Array<{
    issue: string;
    solutions: string[];
  }> {
    if (issue) {
      return this.systemHelp.troubleshooting.commonIssues.filter((item) =>
        item.issue.toLowerCase().includes(issue.toLowerCase()),
      );
    }
    return this.systemHelp.troubleshooting.commonIssues;
  }

  /**
   * Busca contenido relevante en el contexto
   */
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

    // Buscar capacidades relevantes
    const relevantCapabilities = roleContext.capabilities.filter(
      (capability) =>
        capability.toLowerCase().includes(queryLower) ||
        this.containsKeywords(capability.toLowerCase(), queryLower),
    );

    // Buscar consultas similares
    const relevantQueries = roleContext.commonQueries.filter(
      (commonQuery) =>
        commonQuery.toLowerCase().includes(queryLower) ||
        this.containsKeywords(commonQuery.toLowerCase(), queryLower),
    );

    // Buscar guías sugeridas
    const suggestedGuides = Object.entries(this.systemHelp.stepByStepGuides)
      .filter(
        ([key, guide]) =>
          (guide.applicableRoles.includes(roleCode) ||
            guide.applicableRoles.includes('ALL')) &&
          (guide.title.toLowerCase().includes(queryLower) ||
            this.containsKeywords(guide.title.toLowerCase(), queryLower)),
      )
      .map(([key, guide]) => ({ key, title: guide.title }));

    return {
      relevantCapabilities,
      relevantQueries,
      suggestedGuides,
    };
  }

  /**
   * Refresca los contextos desde los archivos (útil para desarrollo)
   */
  reloadContexts(): void {
    this.loadContextFiles();
    this.logger.log('Context files reloaded');
  }

  /**
   * Obtiene información del sistema
   */
  getSystemInfo(): BaseContext['system'] {
    return this.baseContext.system;
  }

  /**
   * Obtiene información de todos los roles (solo para admin)
   */
  getAllRolesInfo(): Record<string, RoleContext> {
    return this.rolesContext;
  }

  /**
   * Obtiene todas las guías del sistema
   */
  getAllGuides(): Record<
    string,
    {
      title: string;
      applicableRoles: string[];
      steps: string[];
      description?: string;
    }
  > {
    return this.systemHelp.stepByStepGuides;
  }

  /**
   * Obtiene estadísticas del contexto cargado
   */
  getContextStats(): {
    totalRoles: number;
    totalGuides: number;
    totalTroubleshootingIssues: number;
    lastLoaded: Date;
  } {
    return {
      totalRoles: Object.keys(this.rolesContext).length,
      totalGuides: Object.keys(this.systemHelp.stepByStepGuides).length,
      totalTroubleshootingIssues:
        this.systemHelp.troubleshooting.commonIssues.length,
      lastLoaded: new Date(), // En una implementación real, guardarías la fecha de carga
    };
  }

  /**
   * Valida la estructura de los contextos cargados
   */
  validateContexts(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar contexto base
    if (!this.baseContext) {
      errors.push('Base context not loaded');
    } else {
      if (!this.baseContext.system?.name) {
        errors.push('System name missing in base context');
      }
      if (!this.baseContext.assistant?.name) {
        errors.push('Assistant name missing in base context');
      }
      if (!this.baseContext.baseInstructions?.length) {
        warnings.push('No base instructions found');
      }
    }

    // Validar contextos de roles
    if (!this.rolesContext) {
      errors.push('Roles context not loaded');
    } else {
      Object.entries(this.rolesContext).forEach(([roleCode, roleData]) => {
        if (!roleData.name) {
          errors.push(`Role ${roleCode} missing name`);
        }
        if (!roleData.capabilities?.length) {
          warnings.push(`Role ${roleCode} has no capabilities defined`);
        }
        if (!roleData.commonQueries?.length) {
          warnings.push(`Role ${roleCode} has no common queries defined`);
        }
      });
    }

    // Validar ayuda del sistema
    if (!this.systemHelp) {
      errors.push('System help not loaded');
    } else {
      if (!this.systemHelp.quickHelp) {
        errors.push('Quick help section missing');
      }
      if (!this.systemHelp.stepByStepGuides) {
        errors.push('Step by step guides section missing');
      }
      if (!this.systemHelp.troubleshooting?.commonIssues) {
        warnings.push('No troubleshooting issues defined');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private containsKeywords(text: string, query: string): boolean {
    const keywords = query.split(' ').filter((word) => word.length > 2);
    return keywords.some((keyword) => text.includes(keyword));
  }
}
