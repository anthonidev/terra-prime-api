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

  buildOptimizedPrompt(
    user: User,
    userMessage: string,
    conversationHistory: string = '',
  ): string {
    try {
      if (!this.baseContext || !this.rolesContext) {
        this.logger.warn('Context not fully loaded, using basic prompt');
        return this.buildBasicPrompt(user, userMessage, conversationHistory);
      }

      const roleCode = user.role.code;
      const roleEmoji = this.getRoleEmoji(roleCode);
      const capabilities = this.getRoleCapabilities(roleCode);

      const specificGuide = this.findRelevantGuide(userMessage, roleCode);
      const relatedCapabilities = this.findRelatedCapabilities(
        userMessage,
        roleCode,
      );

      const limitedHistory = conversationHistory
        ? `\nÚltimos mensajes:\n${conversationHistory.split('\n\n').slice(-2).join('\n')}\n`
        : '';

      let specificInfo = '';
      if (specificGuide) {
        specificInfo = `\n📚 GUÍA ESPECÍFICA DISPONIBLE:
Título: ${specificGuide.title}
Pasos exactos:
${specificGuide.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}
`;
      }

      let relatedInfo = '';
      if (relatedCapabilities.length > 0) {
        relatedInfo = `\n💪 CAPACIDADES RELACIONADAS:
${relatedCapabilities.join(', ')}
`;
      }

      return `🤖 SmartBot - Asistente de Huertas Inmobiliaria

Usuario: ${user.firstName} ${user.lastName}
${roleEmoji} Rol: ${user.role.name} (${roleCode})
Capacidades: ${capabilities.join(', ')}${limitedHistory}${specificInfo}${relatedInfo}

Consulta: "${userMessage}"

INSTRUCCIONES IMPORTANTES:
- SIEMPRE usar emojis relevantes
- Si HAY GUÍA ESPECÍFICA: usar EXACTAMENTE los pasos de la guía, no inventar
- Si consulta SIMPLE: máx 150 chars, directo
- Si consulta COMPLEJA: usar los pasos detallados de la guía si existe
- Usar "${user.firstName}" cuando sea natural
- Solo información autorizada para el rol ${roleCode}
- Si menciona campos/formularios: usar EXACTAMENTE los campos de la guía
- Navegación: usar EXACTAMENTE las rutas mencionadas en los pasos
- Tono amigable y profesional

Respuesta:`;
    } catch (error) {
      this.logger.error(`Error building optimized prompt: ${error.message}`);
      return this.buildBasicPrompt(user, userMessage, conversationHistory);
    }
  }

  private findRelevantGuide(
    query: string,
    roleCode: string,
  ): { title: string; steps: string[] } | null {
    const queryLower = query.toLowerCase();

    const guideKeywords = {
      createUser: [
        'crear usuario',
        'nuevo usuario',
        'crear un usuario',
        'campos usuario',
        'formulario usuario',
      ],
      listUsers: [
        'listar usuarios',
        'ver usuarios',
        'filtrar usuarios',
        'buscar usuarios',
      ],
      updateUser: [
        'actualizar usuario',
        'editar usuario',
        'modificar usuario',
        'cambiar usuario',
      ],
      createProjectExcel: [
        'crear proyecto',
        'nuevo proyecto',
        'cargar excel',
        'proyecto excel',
        'plantilla excel',
      ],
      listProjects: ['listar proyectos', 'ver proyectos', 'filtrar proyectos'],
      projectDetail: [
        'detalle proyecto',
        'ver proyecto',
        'editar proyecto',
        'proyecto completo',
      ],
      downloadExcelTemplate: [
        'descargar plantilla',
        'plantilla excel',
        'template excel',
      ],
      validateProjectFile: [
        'validar archivo',
        'validar excel',
        'error archivo',
        'archivo proyecto',
      ],
      registerLead: ['registrar lead', 'nuevo lead', 'crear lead'],
      processPayment: ['procesar pago', 'registrar pago', 'pago cliente'],
    };

    for (const [guideKey, keywords] of Object.entries(guideKeywords)) {
      if (keywords.some((keyword) => queryLower.includes(keyword))) {
        const guide = this.getStepByStepGuide(guideKey, roleCode);
        if (guide) {
          return guide;
        }
      }
    }

    return null;
  }

  private findRelatedCapabilities(query: string, roleCode: string): string[] {
    const roleContext =
      this.rolesContext[roleCode] || this.rolesContext.DEFAULT;
    const queryWords = query.toLowerCase().split(' ');

    return roleContext.capabilities
      .filter((capability) =>
        queryWords.some(
          (word) => word.length > 3 && capability.toLowerCase().includes(word),
        ),
      )
      .slice(0, 3);
  }

  getRelevantContext(query: string, roleCode: string): string {
    const specificGuide = this.findRelevantGuide(query, roleCode);

    if (specificGuide) {
      return `\n📚 GUÍA ESPECÍFICA: ${specificGuide.title}\nPasos: ${specificGuide.steps.slice(0, 3).join(', ')}...`;
    }

    const roleContext =
      this.rolesContext[roleCode] || this.rolesContext.DEFAULT;
    const queryLower = query.toLowerCase();

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

  detectFormFieldsQuery(query: string): boolean {
    const fieldsKeywords = [
      'campos',
      'formulario',
      'datos',
      'información',
      'llenar',
      'completar',
      'requiere',
      'necesita',
      'que datos',
      'que información',
    ];

    return fieldsKeywords.some((keyword) =>
      query.toLowerCase().includes(keyword),
    );
  }

  getFormFields(context: string, roleCode: string): string[] {
    const formFields = {
      usuario: [
        'Nombre del usuario',
        'Apellido del usuario',
        'Documento de Identidad',
        'Email (debe ser único)',
        'Rol (seleccionar de lista desplegable)',
        'Contraseña (mínimo 6 caracteres)',
      ],
      proyecto: [
        'Nombre del Proyecto',
        'Moneda (USD o PEN)',
        'Archivo Excel con lotes',
        'Etapas del proyecto',
        'Manzanas por etapa',
        'Lotes con área y precios',
      ],
      lead: [
        'Nombre completo',
        'Documento de identidad',
        'Teléfono de contacto',
        'Email (opcional)',
        'Fuente del lead',
        'Observaciones',
      ],
    };

    const contextLower = context.toLowerCase();

    if (contextLower.includes('usuario')) {
      return formFields.usuario;
    } else if (contextLower.includes('proyecto')) {
      return formFields.proyecto;
    } else if (contextLower.includes('lead')) {
      return formFields.lead;
    }

    return [];
  }

  getRoleEmoji(roleCode: string): string {
    try {
      if (!this.baseContext) {
        return '⚙️'; // Emoji por defecto
      }
      // Usar el emoji del contexto base si está disponible
      const contextEmojis = {
        SYS: '👑',
        ADM: '👔',
        JVE: '🎯',
        VEN: '🤝',
        REC: '📞',
        COB: '💸',
        DEFAULT: '🤖',
      };
      return contextEmojis[roleCode] || contextEmojis.DEFAULT || '⚙️';
    } catch (error) {
      this.logger.error(`Error getting role emoji: ${error.message}`);
      return '⚙️';
    }
  }

  buildUserSummary(user: User): string {
    const roleEmoji = this.getRoleEmoji(user.role.code);
    return `${roleEmoji} ${user.firstName} ${user.lastName} - ${user.role.name}`;
  }

  getQuickHelp(roleCode: string): string[] {
    try {
      if (!this.systemHelp || !this.systemHelp.quickHelp) {
        this.logger.warn('SystemHelp not loaded yet, returning default help');
        return this.getDefaultQuickHelp(roleCode);
      }
      return (
        this.systemHelp.quickHelp[roleCode] ||
        this.systemHelp.quickHelp.DEFAULT ||
        this.getDefaultQuickHelp(roleCode)
      );
    } catch (error) {
      this.logger.error(`Error getting quick help: ${error.message}`);
      return this.getDefaultQuickHelp(roleCode);
    }
  }

  getStepByStepGuide(
    guideKey: string,
    userRoleCode: string,
  ): { title: string; steps: string[] } | null {
    try {
      if (!this.systemHelp || !this.systemHelp.stepByStepGuides) {
        this.logger.warn('SystemHelp not loaded yet, guide not available');
        return null;
      }

      const guide = this.systemHelp.stepByStepGuides[guideKey];
      if (
        !guide ||
        (!guide.applicableRoles.includes(userRoleCode) &&
          !guide.applicableRoles.includes('ALL'))
      ) {
        return null;
      }
      return { title: guide.title, steps: guide.steps };
    } catch (error) {
      this.logger.error(`Error getting step by step guide: ${error.message}`);
      return null;
    }
  }

  getTroubleshootingHelp(
    issue?: string,
  ): Array<{ issue: string; solutions: string[] }> {
    try {
      if (!this.systemHelp || !this.systemHelp.troubleshooting) {
        return [];
      }
      const issues = this.systemHelp.troubleshooting.commonIssues;
      return issue
        ? issues.filter((item) =>
            item.issue.toLowerCase().includes(issue.toLowerCase()),
          )
        : issues;
    } catch (error) {
      this.logger.error(`Error getting troubleshooting help: ${error.message}`);
      return [];
    }
  }

  searchContextContent(
    query: string,
    roleCode: string,
  ): {
    relevantCapabilities: string[];
    relevantQueries: string[];
    suggestedGuides: Array<{ key: string; title: string }>;
  } {
    try {
      const roleContext =
        this.rolesContext[roleCode] || this.rolesContext.DEFAULT;
      const queryLower = query.toLowerCase();

      const relevantCapabilities = roleContext.capabilities
        .filter((cap) => cap.toLowerCase().includes(queryLower))
        .slice(0, 3);

      const relevantQueries = roleContext.commonQueries
        .filter((q) => q.toLowerCase().includes(queryLower))
        .slice(0, 3);

      const suggestedGuides = Object.entries(
        this.systemHelp.stepByStepGuides || {},
      )
        .filter(
          ([key, guide]: [string, any]) =>
            (guide.applicableRoles.includes(roleCode) ||
              guide.applicableRoles.includes('ALL')) &&
            guide.title.toLowerCase().includes(queryLower),
        )
        .slice(0, 2)
        .map(([key, guide]: [string, any]) => ({ key, title: guide.title }));

      return { relevantCapabilities, relevantQueries, suggestedGuides };
    } catch (error) {
      this.logger.error(`Error searching context content: ${error.message}`);
      return {
        relevantCapabilities: [],
        relevantQueries: [],
        suggestedGuides: [],
      };
    }
  }

  reloadContexts(): void {
    this.loadContextFiles();
  }

  getAllGuides(): any {
    return this.systemHelp?.stepByStepGuides || {};
  }

  // ========== MÉTODOS AUXILIARES PARA MANEJO SEGURO ==========

  private getDefaultQuickHelp(roleCode: string): string[] {
    const defaultHelp = {
      SYS: [
        '¿Cómo crear un nuevo usuario?',
        '¿Cómo crear un proyecto con Excel?',
        '¿Cómo validar archivo de proyecto?',
        '¿Cómo listar usuarios?',
      ],
      VEN: [
        '¿Cómo consultar mis leads?',
        '¿Cómo realizar una venta?',
        '¿Qué lotes están disponibles?',
        '¿Cómo generar cotización?',
      ],
      ADM: [
        '¿Cómo revisar las ventas?',
        '¿Cómo gestionar pagos?',
        '¿Cómo generar reportes?',
        '¿Cómo supervisar vendedores?',
      ],
      JVE: [
        '¿Cómo evaluar el equipo?',
        '¿Cómo asignar leads?',
        '¿Cómo establecer metas?',
        '¿Cómo analizar conversiones?',
      ],
      REC: [
        '¿Cómo registrar visitantes?',
        '¿Cómo marcar llegadas?',
        '¿Cómo programar citas?',
        '¿Cómo actualizar datos?',
      ],
      COB: [
        '¿Cómo revisar cartera?',
        '¿Cómo contactar morosos?',
        '¿Cómo crear planes de pago?',
        '¿Cómo generar reportes?',
      ],
      DEFAULT: [
        '¿Cómo funciona el sistema?',
        '¿Cómo actualizar mi perfil?',
        '¿Cómo contactar soporte?',
      ],
    };

    return defaultHelp[roleCode] || defaultHelp.DEFAULT;
  }

  private getRoleCapabilities(roleCode: string): string[] {
    try {
      if (!this.rolesContext || !this.rolesContext[roleCode]) {
        return this.getDefaultCapabilities(roleCode);
      }
      return (
        this.rolesContext[roleCode].capabilities ||
        this.getDefaultCapabilities(roleCode)
      );
    } catch (error) {
      return this.getDefaultCapabilities(roleCode);
    }
  }

  private getDefaultCapabilities(roleCode: string): string[] {
    const defaultCapabilities = {
      SYS: [
        'gestión de usuarios',
        'gestión de proyectos',
        'configuración del sistema',
      ],
      VEN: ['gestión de clientes', 'proceso de ventas', 'seguimiento de leads'],
      ADM: [
        'supervisión de ventas',
        'gestión de pagos',
        'reportes financieros',
      ],
      JVE: [
        'supervisión del equipo',
        'asignación de leads',
        'análisis de ventas',
      ],
      REC: [
        'registro de visitantes',
        'gestión de llegadas',
        'atención al cliente',
      ],
      COB: [
        'gestión de pagos pendientes',
        'seguimiento de morosos',
        'planes de pago',
      ],
      DEFAULT: ['consultas básicas', 'actualización de perfil'],
    };

    return defaultCapabilities[roleCode] || defaultCapabilities.DEFAULT;
  }

  private buildBasicPrompt(
    user: User,
    userMessage: string,
    conversationHistory: string,
  ): string {
    const roleEmoji = this.getRoleEmoji(user.role.code);

    return `🤖 SmartBot - Asistente de Huertas Inmobiliaria

Usuario: ${user.firstName} ${user.lastName}
${roleEmoji} Rol: ${user.role.name}

Consulta: "${userMessage}"

INSTRUCCIONES BÁSICAS:
- Responder de manera amigable y profesional
- Usar emojis relevantes
- Proporcionar información útil para el rol ${user.role.code}
- Usar "${user.firstName}" cuando sea natural

Respuesta:`;
  }
}
