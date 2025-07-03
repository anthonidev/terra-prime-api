import { Injectable, Logger } from '@nestjs/common';
import {
  AgentContext,
  BaseRoleAgent,
  RoleAgentResponse,
} from '../interfaces/role-agent.interface';
import { ClaudeApiService } from '../services/claude-api.service';

@Injectable()
export class SysRoleAgent extends BaseRoleAgent {
  private readonly logger = new Logger(SysRoleAgent.name);

  constructor(private readonly claudeApiService: ClaudeApiService) {
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

  protected getContextualPrompt(context: AgentContext): string {
    const { user, message, conversationHistory } = context;

    const limitedHistory = conversationHistory
      ? `\nÚltimos mensajes:\n${conversationHistory.split('\n\n').slice(-2).join('\n')}\n`
      : '';

    const specificGuide = this.findSpecificGuide(message);
    const relatedCapability = this.findRelevantCapability(message);

    let guideSection = '';
    if (specificGuide) {
      guideSection = `\n📚 GUÍA ESPECÍFICA DISPONIBLE:
${specificGuide}
`;
    }

    let capabilitySection = '';
    if (relatedCapability) {
      capabilitySection = `\n💪 CAPACIDAD RELACIONADA: ${relatedCapability}`;
    }

    return `🤖 SmartBot - Huertas Inmobiliaria | Administrador del Sistema

👑 Usuario: ${user.firstName} ${user.lastName} - Administrador del Sistema
🎯 Capacidades: ${this.capabilities.slice(0, 3).join(', ')}${limitedHistory}${guideSection}${capabilitySection}

Consulta: "${message}"

INSTRUCCIONES ESPECÍFICAS PARA ADMINISTRADOR:
- SIEMPRE usar emojis relevantes
- Respuestas técnicas precisas para gestión del sistema
- Si HAY GUÍA: usar EXACTAMENTE los pasos de la guía
- Si consulta SIMPLE: máx 150 chars, directo al punto
- Si consulta COMPLEJA: pasos detallados paso a paso
- Mencionar ubicaciones exactas de menús y botones
- Incluir validaciones y verificaciones importantes
- Usar "${user.firstName}" cuando sea natural

Contexto especializado:
• Usuarios: Crear, listar, actualizar con roles específicos
• Proyectos: Carga Excel, validación, gestión completa
• Configuración: Acceso total a configuraciones del sistema
• Reportes: Todos los reportes y estadísticas disponibles

Respuesta técnica especializada:`;
  }

  private findSpecificGuide(message: string): string | null {
    const guides = {
      'crear usuario': `Pasos exactos:
1. 👥 Menú "Usuarios" → "+ Nuevo Usuario"
2. 📝 Completar: Nombre, Apellido, Documento, Email, Rol, Contraseña
3. 💾 "Crear Usuario" → Verificar confirmación`,

      'proyecto excel': `Pasos exactos:
1. 🏘️ "Gestión de Proyectos" → "Nuevo Proyecto"
2. 📊 Cargar archivo Excel → "Validar archivo"
3. 🔍 Revisar datos → "Crear Proyecto"`,

      'plantilla excel': `Ubicación exacta:
1. 🏘️ "Gestión de Proyectos" → "Nuevo Proyecto"
2. ⬇️ "Descargar plantilla Excel"
3. 📝 Completar: Nombre proyecto, Moneda, Datos de lotes`,
    };

    const messageLower = message.toLowerCase();
    const guideKey = Object.keys(guides).find((key) =>
      messageLower.includes(key),
    );

    return guideKey ? guides[guideKey] : null;
  }

  private needsGuide(message: string): boolean {
    const guideKeywords = ['crear', 'cómo', 'pasos', 'proceso', 'nuevo'];
    return guideKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword),
    );
  }

  private getSuggestedActions(message: string): string[] {
    if (message.toLowerCase().includes('usuario')) {
      return ['Crear usuario', 'Listar usuarios', 'Editar usuario'];
    }
    if (message.toLowerCase().includes('proyecto')) {
      return ['Nuevo proyecto', 'Ver proyectos', 'Descargar plantilla'];
    }
    return ['Ver menú principal', 'Consultar guías', 'Contactar soporte'];
  }

  private getRelatedFeatures(message: string): string[] {
    const messageLower = message.toLowerCase();

    if (messageLower.includes('usuario')) {
      return [
        'Gestión de roles',
        'Permisos de acceso',
        'Configuración de usuarios',
      ];
    }
    if (messageLower.includes('proyecto')) {
      return [
        'Gestión de lotes',
        'Reportes de proyecto',
        'Configuración de etapas',
      ];
    }
    if (messageLower.includes('excel')) {
      return [
        'Validación de archivos',
        'Plantillas del sistema',
        'Carga masiva',
      ];
    }

    return [
      'Dashboard principal',
      'Reportes del sistema',
      'Configuración general',
    ];
  }
}
