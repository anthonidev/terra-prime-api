import { Injectable, Logger } from '@nestjs/common';
import {
  AgentContext,
  BaseRoleAgent,
  RoleAgentResponse,
} from '../interfaces/role-agent.interface';
import { ClaudeApiService } from '../services/claude-api.service';
import { ContextService } from '../services/context.service';

@Injectable()
export class SysRoleAgent extends BaseRoleAgent {
  private readonly logger = new Logger(SysRoleAgent.name);

  constructor(
    private readonly claudeApiService: ClaudeApiService,
    private readonly contextService: ContextService,
  ) {
    super('SYS');
  }

  async processMessage(context: AgentContext): Promise<RoleAgentResponse> {
    try {
      if (!this.claudeApiService.isAvailable()) {
        return this.generateFallbackResponse(context.user.firstName);
      }

      const prompt = this.getContextualPrompt(context);
      const response = await this.claudeApiService.sendMessage([
        { role: 'user', content: prompt },
      ]);

      return {
        content: response,
        metadata: {
          needsGuide: this.needsGuide(context.message),
          suggestedActions: this.getSuggestedActions(context.message),
          relatedFeatures: this.getRelatedFeatures(context.message),
        },
      };
    } catch (error) {
      this.logger.error(`Error in SYS agent: ${error.message}`);
      return this.generateFallbackResponse(context.user.firstName);
    }
  }

  protected getCapabilities(): string[] {
    // Capacidades por defecto para SYS (fallback)
    return [
      '👥 Gestión completa de usuarios',
      '🏘️ Gestión completa de proyectos',
      '📊 Carga masiva mediante Excel',
      '⚙️ Configuración del sistema',
      '📈 Acceso a todos los reportes',
      '🔧 Administración de roles',
      '📋 Gestión de etapas y lotes',
      '💾 Validación de archivos',
    ];
  }

  protected getCommonQueries(): string[] {
    // Consultas comunes por defecto para SYS (fallback)
    return [
      '¿Cómo crear un nuevo usuario?',
      '¿Cómo listar usuarios?',
      '¿Cómo crear proyecto con Excel?',
      '¿Cómo descargar plantilla Excel?',
      '¿Cómo validar archivo?',
      '¿Cómo ver detalle de proyecto?',
      '¿Cómo editar lotes y etapas?',
    ];
  }

  // Métodos para obtener datos del contexto en tiempo de ejecución
  private getCapabilitiesFromContext(): string[] {
    try {
      const quickHelp = this.contextService.getQuickHelp('SYS');
      if (quickHelp && quickHelp.length > 0) {
        return quickHelp;
      }
    } catch (error) {
      this.logger.warn(
        'No se pudo obtener capacidades del contexto, usando fallback',
      );
    }
    return this.getCapabilities();
  }

  private getQueriesFromContext(): string[] {
    try {
      const quickHelp = this.contextService.getQuickHelp('SYS');
      if (quickHelp && quickHelp.length > 0) {
        return quickHelp;
      }
    } catch (error) {
      this.logger.warn(
        'No se pudo obtener consultas del contexto, usando fallback',
      );
    }
    return this.getCommonQueries();
  }

  protected getContextualPrompt(context: AgentContext): string {
    const { user, message, conversationHistory } = context;

    // Usar el método optimizado del ContextService
    const optimizedPrompt = this.contextService.buildOptimizedPrompt(
      user,
      message,
      conversationHistory,
    );

    // Obtener información adicional del contexto en tiempo de ejecución
    const capabilities = this.getCapabilitiesFromContext();
    const commonQueries = this.getQueriesFromContext();

    // Agregar instrucciones específicas para el agente SYS
    const sysSpecificInstructions = `

INSTRUCCIONES ESPECÍFICAS PARA ADMINISTRADOR DEL SISTEMA:
- ⚡ Respuestas técnicas precisas para gestión administrativa
- 🎯 Si consulta SIMPLE: máximo 150 caracteres, directo al punto
- 📚 Si consulta COMPLEJA: usar EXACTAMENTE los pasos de las guías disponibles
- 🔍 Mencionar ubicaciones EXACTAS de menús y botones
- ✅ Incluir validaciones y verificaciones importantes
- 👑 Enfoque en funciones administrativas avanzadas

CAPACIDADES PRINCIPALES DEL SISTEMA:
${capabilities
  .slice(0, 4)
  .map((cap) => `• ${cap}`)
  .join('\n')}

CONTEXTO TÉCNICO ESPECIALIZADO:
• Usuarios: Crear, listar, actualizar con validaciones de roles
• Proyectos: Carga Excel con validación completa, gestión de estructuras
• Sistema: Configuraciones globales, permisos, roles avanzados
• Reportes: Acceso completo a analytics y estadísticas del sistema

Respuesta técnica especializada para administrador:`;

    return optimizedPrompt + sysSpecificInstructions;
  }

  private needsGuide(message: string): boolean {
    const guideKeywords = [
      'crear',
      'cómo',
      'pasos',
      'proceso',
      'nuevo',
      'configurar',
      'instalar',
      'setup',
      'configuración',
      'administrar',
    ];
    return guideKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword),
    );
  }

  private getSuggestedActions(message: string): string[] {
    const messageLower = message.toLowerCase();

    if (messageLower.includes('usuario')) {
      return [
        'Crear usuario',
        'Listar usuarios',
        'Editar usuario',
        'Gestionar roles',
      ];
    }
    if (messageLower.includes('proyecto')) {
      return [
        'Nuevo proyecto',
        'Ver proyectos',
        'Descargar plantilla',
        'Validar Excel',
      ];
    }
    if (messageLower.includes('excel') || messageLower.includes('archivo')) {
      return [
        'Descargar plantilla',
        'Validar archivo',
        'Revisar errores',
        'Cargar proyecto',
      ];
    }
    if (
      messageLower.includes('configurar') ||
      messageLower.includes('sistema')
    ) {
      return [
        'Configurar sistema',
        'Gestionar permisos',
        'Ver configuraciones',
      ];
    }
    if (messageLower.includes('reporte')) {
      return ['Generar reportes', 'Ver estadísticas', 'Exportar datos'];
    }

    return ['Ver menú principal', 'Consultar guías', 'Configurar sistema'];
  }

  private getRelatedFeatures(message: string): string[] {
    const messageLower = message.toLowerCase();

    if (messageLower.includes('usuario')) {
      return [
        'Sistema de roles y permisos',
        'Autenticación y seguridad',
        'Gestión de accesos',
      ];
    }
    if (messageLower.includes('proyecto')) {
      return [
        'Gestión de lotes y etapas',
        'Reportes de proyectos',
        'Configuración de monedas',
      ];
    }
    if (messageLower.includes('excel')) {
      return [
        'Validación de archivos',
        'Plantillas del sistema',
        'Procesamiento masivo',
      ];
    }
    if (messageLower.includes('reporte')) {
      return [
        'Analytics avanzados',
        'Exportación de datos',
        'Dashboard administrativo',
      ];
    }

    return [
      'Panel de administración',
      'Configuraciones globales',
      'Monitoreo del sistema',
    ];
  }

  // Métodos adicionales para aprovechar el contexto cargado
  private getSpecificGuideFromContext(message: string): any {
    const messageLower = message.toLowerCase();

    // Buscar guías específicas en el contexto
    try {
      if (messageLower.includes('crear usuario')) {
        return this.contextService.getStepByStepGuide('createUser', 'SYS');
      }
      if (messageLower.includes('listar usuario')) {
        return this.contextService.getStepByStepGuide('listUsers', 'SYS');
      }
      if (
        messageLower.includes('actualizar usuario') ||
        messageLower.includes('editar usuario')
      ) {
        return this.contextService.getStepByStepGuide('updateUser', 'SYS');
      }
      if (
        messageLower.includes('proyecto excel') ||
        messageLower.includes('crear proyecto')
      ) {
        return this.contextService.getStepByStepGuide(
          'createProjectExcel',
          'SYS',
        );
      }
      if (messageLower.includes('plantilla excel')) {
        return this.contextService.getStepByStepGuide(
          'downloadExcelTemplate',
          'SYS',
        );
      }
      if (
        messageLower.includes('validar archivo') ||
        messageLower.includes('validar excel')
      ) {
        return this.contextService.getStepByStepGuide(
          'validateProjectFile',
          'SYS',
        );
      }
      if (
        messageLower.includes('detalle proyecto') ||
        messageLower.includes('ver proyecto')
      ) {
        return this.contextService.getStepByStepGuide('projectDetail', 'SYS');
      }
    } catch (error) {
      this.logger.warn('Error obteniendo guía específica del contexto');
    }

    return null;
  }
}
