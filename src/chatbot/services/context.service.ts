import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { User } from 'src/user/entities/user.entity';
import { baseContextData } from '../context/base-context';
import { rolesContextData } from '../context/roles-context';
import { systemHelpData } from '../context/system-help';
import {
  BaseContext,
  RoleContext,
  SystemHelp,
} from '../interfaces/context.interface';

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
      this.baseContext = baseContextData;
      this.rolesContext = rolesContextData;
      this.systemHelp = systemHelpData;

      this.logger.log('Context files loaded successfully');
    } catch (error) {
      this.logger.error(`Error loading context files: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera el contexto completo para un usuario específico
   * VERSIÓN MEJORADA con información personal del usuario
   */
  buildUserContext(user: User): string {
    const roleCode = user.role.code;
    const roleContext =
      this.rolesContext[roleCode] || this.rolesContext.DEFAULT;

    // Calcular tiempo en el sistema
    const joinedDate = new Date(user.createdAt);
    const now = new Date();
    const daysSinceJoined = Math.floor(
      (now.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const context = `${this.baseContext.assistant.name} - Sistema ${this.baseContext.system.name}

=== INFORMACIÓN COMPLETA DEL USUARIO ACTUAL ===
- Nombre completo: ${user.firstName + ' ' + user.lastName}
- Nombre de pila: ${user.firstName}
- Email: ${user.email}
- Documento: ${user.document}
- Rol actual: ${roleContext.name} (${roleCode})
- Usuario activo: ${user.isActive ? 'Sí' : 'No'}
- Fecha de registro: ${joinedDate.toLocaleDateString('es-ES')}
- Días en el sistema: ${daysSinceJoined} días
- Última actividad: ${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('es-ES') : 'No disponible'}
- Foto de perfil: ${user.photo ? 'Configurada' : 'No configurada'}

=== INSTRUCCIONES BASE DEL ASISTENTE ===
${this.baseContext.baseInstructions.map((instruction) => `• ${instruction}`).join('\n')}

=== LIMITACIONES IMPORTANTES ===
${this.baseContext.limitations.map((limitation) => `• ${limitation}`).join('\n')}

=== CONTEXTO DEL ROL: ${roleContext.name} (${roleCode}) ===
${roleContext.description}

CAPACIDADES ESPECÍFICAS DE ${user.firstName} EN SU ROL:
${roleContext.capabilities.map((capability) => `• ${capability}`).join('\n')}

=== CONSULTAS FRECUENTES PARA ${roleContext.name} ===
${roleContext.commonQueries.map((query) => `• ${query}`).join('\n')}

=== FLUJOS DE TRABAJO TÍPICOS PARA ${user.firstName} ===
${roleContext.workflows.map((workflow) => `• ${workflow}`).join('\n')}

=== PERSONALIDAD Y ESTILO DEL ASISTENTE ===
- Personalidad: ${this.baseContext.assistant.personality}
- Tono de comunicación: ${this.baseContext.assistant.tone}
- Idioma: ${this.baseContext.assistant.language}

=== INSTRUCCIONES ESPECÍFICAS PARA INTERACTUAR CON ${user.firstName} + ${user.lastName} ===
1. PERSONALIZACIÓN: Puedes dirigirte al usuario como "${user.firstName}" o "${user.lastName}" según el contexto
2. EXPERIENCIA: Considera que lleva ${daysSinceJoined} días usando el sistema
3. ROL ESPECÍFICO: Todas las respuestas deben estar contextualizadas para el rol de ${roleContext.name}
4. CAPACIDADES: Solo proporciona información y ayuda dentro del alcance de las capacidades de su rol
5. TONO PERSONAL: Mantén un tono ${this.baseContext.assistant.tone} pero personalizado
6. INFORMACIÓN PERSONAL: Si pregunta quién es, usa la información proporcionada arriba

REGLAS IMPORTANTES:
- SIEMPRE responde en español
- NUNCA proporciones información fuera del alcance del rol ${roleCode}
- SIEMPRE considera el contexto personal del usuario en tus respuestas
- PERSONALIZA las respuestas usando su nombre cuando sea apropiado
- ENFÓCATE únicamente en las capacidades y responsabilidades de su rol específico
- Si pregunta sobre información personal, usa los datos proporcionados en este contexto

INFORMACIÓN ADICIONAL DEL SISTEMA:
- Versión del sistema: ${this.baseContext.system.version}
- Descripción: ${this.baseContext.system.description}`;

    return context;
  }

  /**
   * Construye un resumen personalizado del usuario para usar en prompts
   */
  buildUserSummary(user: User): string {
    const roleContext =
      this.rolesContext[user.role.code] || this.rolesContext.DEFAULT;

    return `Usuario: ${user.firstName} ${user.lastName} (${user.email})
Rol: ${roleContext.name} (${user.role.code})
Experiencia en el sistema: ${Math.floor(
      (new Date().getTime() - new Date(user.createdAt).getTime()) /
        (1000 * 60 * 60 * 24),
    )} días
Estado: ${user.isActive ? 'Activo' : 'Inactivo'}`;
  }

  /**
   * Obtiene ayuda rápida personalizada para un usuario específico
   */
  getPersonalizedQuickHelp(user: User): Array<{
    question: string;
    category: string;
    relevance: 'high' | 'medium' | 'low';
  }> {
    const roleHelp = this.getQuickHelp(user.role.code);

    return roleHelp.map((question, index) => ({
      question,
      category: this.categorizeQuestion(question),
      relevance: index < 3 ? 'high' : index < 6 ? 'medium' : 'low',
    }));
  }

  /**
   * Categoriza una pregunta para mejor organización
   */
  private categorizeQuestion(question: string): string {
    const categories = {
      gestión: ['crear', 'gestionar', 'administrar', 'configurar'],
      consultas: ['consultar', 'ver', 'revisar', 'buscar'],
      procesos: ['proceso', 'realizar', 'ejecutar', 'completar'],
      reportes: ['reporte', 'estadística', 'análisis', 'generar'],
      ayuda: ['ayuda', 'soporte', 'contactar', 'problema'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (
        keywords.some((keyword) =>
          question.toLowerCase().includes(keyword.toLowerCase()),
        )
      ) {
        return category;
      }
    }

    return 'general';
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
