import { Injectable, Logger } from '@nestjs/common';
import { ClaudeApiService } from './claude-api.service';

@Injectable()
export class SessionTitleService {
  private readonly logger = new Logger(SessionTitleService.name);

  constructor(private readonly claudeApiService: ClaudeApiService) {}

  async generateTitle(firstMessage: string, userRole: string): Promise<string> {
    try {
      if (this.claudeApiService.isAvailable()) {
        return await this.generateTitleWithAI(firstMessage, userRole);
      } else {
        return this.generateFallbackTitle(firstMessage, userRole);
      }
    } catch (error) {
      this.logger.warn(`Error generating title: ${error.message}`);
      return this.generateFallbackTitle(firstMessage, userRole);
    }
  }

  private async generateTitleWithAI(
    firstMessage: string,
    userRole: string,
  ): Promise<string> {
    const roleContext = this.getRoleContext(userRole);

    const titlePrompt = `Genera un título corto y descriptivo (máximo 5 palabras) para una conversación de ${roleContext} que comienza con: "${firstMessage.slice(0, 80)}..."

Ejemplos de buenos títulos:
- "Crear nuevo usuario"
- "Consulta sobre lotes"  
- "Proceso de venta"
- "Validar archivo Excel"
- "Gestión de pagos"

Responde SOLO con el título, sin comillas ni explicaciones.`;

    try {
      const title = await this.claudeApiService.sendMessage(
        [{ role: 'user', content: titlePrompt }],
        { maxTokens: 15, temperature: 0.5 },
      );

      return this.cleanTitle(title);
    } catch (error) {
      throw error;
    }
  }

  private generateFallbackTitle(message: string, userRole: string): string {
    const messageLower = message.toLowerCase();

    // Títulos específicos por rol y contenido
    const rolePatterns = {
      SYS: {
        usuario: 'Gestión de usuarios',
        proyecto: 'Gestión de proyectos',
        excel: 'Carga de archivos',
        validar: 'Validación de datos',
        crear: 'Crear elemento',
        listar: 'Listar información',
      },
      VEN: {
        lead: 'Gestión de leads',
        venta: 'Proceso de venta',
        cliente: 'Atención a cliente',
        lote: 'Consulta de lotes',
        cotización: 'Generar cotización',
        seguimiento: 'Seguimiento comercial',
      },
      ADM: {
        pago: 'Gestión de pagos',
        reporte: 'Reportes financieros',
        venta: 'Supervisión de ventas',
        meta: 'Objetivos comerciales',
      },
      JVE: {
        equipo: 'Gestión de equipo',
        rendimiento: 'Análisis de rendimiento',
        asignar: 'Asignación de leads',
        meta: 'Establecer metas',
      },
      REC: {
        visitante: 'Registro de visitantes',
        llegada: 'Control de llegadas',
        cita: 'Gestión de citas',
        atención: 'Atención al cliente',
      },
      COB: {
        pago: 'Gestión de cobranzas',
        moroso: 'Seguimiento de morosos',
        plan: 'Planes de pago',
        cartera: 'Análisis de cartera',
      },
    };

    const patterns = rolePatterns[userRole] || rolePatterns.SYS;

    // Buscar patrón específico
    for (const [keyword, title] of Object.entries(patterns)) {
      if (messageLower.includes(keyword)) {
        return title.toString();
      }
    }

    // Patrones generales
    if (messageLower.includes('cómo')) {
      return 'Consulta de proceso';
    }
    if (messageLower.includes('dónde')) {
      return 'Ubicación de función';
    }
    if (messageLower.includes('qué')) {
      return 'Información general';
    }
    if (messageLower.includes('problema') || messageLower.includes('error')) {
      return 'Resolución de problemas';
    }

    // Título basado en las primeras palabras
    const firstWords = message.split(' ').slice(0, 4);
    let title = firstWords.join(' ');

    if (title.length > 25) {
      title = title.slice(0, 22) + '...';
    }

    return title || 'Nueva consulta';
  }

  private getRoleContext(userRole: string): string {
    const roleContexts = {
      SYS: 'administración del sistema',
      ADM: 'administración comercial',
      JVE: 'jefatura de ventas',
      VEN: 'ventas',
      REC: 'recepción',
      COB: 'cobranzas',
      FAC: 'facturación',
      SCO: 'supervisión de cobranzas',
    };

    return roleContexts[userRole] || 'consulta general';
  }

  private cleanTitle(title: string): string {
    return title
      .trim()
      .replace(/['"]/g, '')
      .replace(/^(título:|title:)/i, '')
      .trim()
      .slice(0, 50);
  }

  // Método para generar títulos sugeridos basados en rol
  getSuggestedTitles(userRole: string): string[] {
    const suggestions = {
      SYS: [
        'Crear nuevo usuario',
        'Gestión de proyectos',
        'Validar archivo Excel',
        'Configurar sistema',
        'Ver reportes',
      ],
      VEN: [
        'Consultar mis leads',
        'Proceso de venta',
        'Lotes disponibles',
        'Generar cotización',
        'Seguimiento de cliente',
      ],
      ADM: [
        'Revisar ventas',
        'Gestionar pagos',
        'Reportes financieros',
        'Análisis comercial',
        'Control de objetivos',
      ],
      JVE: [
        'Evaluar equipo',
        'Asignar leads',
        'Análisis de conversión',
        'Establecer metas',
        'Coaching comercial',
      ],
      REC: [
        'Registrar visitante',
        'Control de llegadas',
        'Programar cita',
        'Actualizar datos',
        'Gestión de espera',
      ],
      COB: [
        'Revisar cartera',
        'Contactar morosos',
        'Plan de pagos',
        'Reporte cobranzas',
        'Seguimiento financiero',
      ],
    };

    return suggestions[userRole] || suggestions.SYS;
  }
}
