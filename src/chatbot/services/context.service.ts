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
    const roleCode = user.role.code;
    const roleEmoji = contextEmojis.roles[roleCode] || '⚙️';
    const capabilities = roleCapabilities[roleCode] || roleCapabilities.DEFAULT;

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
    return contextEmojis.roles[roleCode] || contextEmojis.roles.DEFAULT || '⚙️';
  }

  buildUserSummary(user: User): string {
    const roleEmoji = this.getRoleEmoji(user.role.code);
    return `${roleEmoji} ${user.firstName} ${user.lastName} - ${user.role.name}`;
  }

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

  getAllGuides(): any {
    return this.systemHelp.stepByStepGuides;
  }
}
