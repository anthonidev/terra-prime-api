import { Injectable, Logger } from '@nestjs/common';
import {
  AgentContext,
  BaseRoleAgent,
  RoleAgentResponse,
} from '../interfaces/role-agent.interface';
import { ClaudeApiService } from '../services/claude-api.service';

@Injectable()
export class VenRoleAgent extends BaseRoleAgent {
  private readonly logger = new Logger(VenRoleAgent.name);

  constructor(private readonly claudeApiService: ClaudeApiService) {
    super('VEN');
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
          needsGuide: this.needsSalesGuide(context.message),
          suggestedActions: this.getSalesActions(context.message),
          relatedFeatures: this.getSalesFeatures(context.message),
        },
      };
    } catch (error) {
      this.logger.error(`Error in VEN agent: ${error.message}`);
      return this.generateFallbackResponse(context.user.firstName);
    }
  }

  protected getCapabilities(): string[] {
    return [
      '👥 Gestión de clientes asignados',
      '💰 Proceso de ventas completo',
      '🎯 Seguimiento de leads',
      '📅 Gestión de citas',
      '🏘️ Consulta de lotes disponibles',
      '💸 Generación de cotizaciones',
      '📋 Registro de actividades',
      '🤝 Cierre de negocios',
    ];
  }

  protected getCommonQueries(): string[] {
    return [
      '¿Cómo consultar mis leads?',
      '¿Cómo realizar una venta?',
      '¿Cómo hacer seguimiento?',
      '¿Qué lotes están disponibles?',
      '¿Cómo generar cotización?',
      '¿Cómo programar visitas?',
      '¿Cómo registrar reserva?',
      '¿Cómo actualizar cliente?',
    ];
  }

  protected getContextualPrompt(context: AgentContext): string {
    const { user, message, conversationHistory } = context;

    const limitedHistory = conversationHistory
      ? `\nÚltimos mensajes:\n${conversationHistory.split('\n\n').slice(-2).join('\n')}\n`
      : '';

    const salesGuide = this.findSalesGuide(message);
    const salesTip = this.getSalesTip(message);

    let guideSection = '';
    if (salesGuide) {
      guideSection = `\n💰 PROCESO DE VENTA ESPECÍFICO:
${salesGuide}
`;
    }

    let tipSection = '';
    if (salesTip) {
      tipSection = `\n💡 TIP DE VENTAS: ${salesTip}`;
    }

    return `🤝 SmartBot - Asistente de Ventas Huertas Inmobiliaria

🤝 Vendedor: ${user.firstName} ${user.lastName}
🎯 Especialización: ${this.capabilities.slice(0, 3).join(', ')}${limitedHistory}${guideSection}${tipSection}

Consulta de ventas: "${message}"

INSTRUCCIONES ESPECIALIZADAS PARA VENTAS:
- SIEMPRE usar emojis de ventas 💰🤝🎯
- Enfoque práctico en resultados comerciales
- Si es proceso COMPLEJO: pasos detallados del flujo de venta
- Si es consulta RÁPIDA: respuesta directa y accionable
- Incluir métricas y KPIs cuando sea relevante
- Mencionar herramientas específicas del CRM de ventas
- Usar "${user.firstName}" para personalizar

Contexto de ventas especializado:
• Leads: Gestión, seguimiento, conversión
• Clientes: Relación, necesidades, objeciones
• Lotes: Disponibilidad, características, precios
• Cotizaciones: Generación, seguimiento, cierre
• Proceso: Prospección → Presentación → Cierre → Post-venta

Respuesta enfocada en ventas:`;
  }

  private findSalesGuide(message: string): string | null {
    const salesGuides = {
      venta: `Proceso completo de venta:
1. 🎯 Calificar lead → Identificar necesidades
2. 🏘️ Mostrar lotes disponibles → Presentar beneficios
3. 💸 Generar cotización → Negociar condiciones
4. 🤝 Cerrar venta → Confirmar detalles
5. 📋 Registrar en sistema → Seguimiento post-venta`,

      seguimiento: `Seguimiento efectivo:
1. 📞 Contacto inicial dentro de 24h
2. 📅 Programar visita al proyecto
3. 💬 Identificar objeciones y necesidades
4. 📊 Enviar información personalizada
5. 🔄 Seguimiento semanal hasta cierre`,

      cotización: `Generar cotización:
1. 🏘️ Seleccionar lote disponible
2. 💰 Calcular precios y financiamiento
3. 📄 Preparar propuesta personalizada
4. 📧 Enviar y explicar condiciones
5. 📞 Seguimiento para confirmación`,
    };

    const messageLower = message.toLowerCase();
    const guideKey = Object.keys(salesGuides).find((key) =>
      messageLower.includes(key),
    );

    return guideKey ? salesGuides[guideKey] : null;
  }

  private getSalesTip(message: string): string | null {
    const tips = {
      objeción:
        'Escucha activamente, valida la preocupación y presenta soluciones específicas',
      precio:
        'Enfócate en el valor, no en el costo. Presenta opciones de financiamiento',
      competencia: 'Destaca ventajas únicas de ubicación, calidad y servicio',
      urgencia:
        'Crea escasez con disponibilidad limitada y condiciones especiales',
      seguimiento:
        'Mantén contacto regular pero no invasivo, aporta valor en cada interacción',
    };

    const messageLower = message.toLowerCase();
    const tipKey = Object.keys(tips).find((key) => messageLower.includes(key));

    return tipKey ? tips[tipKey] : null;
  }

  private needsSalesGuide(message: string): boolean {
    const guideKeywords = [
      'proceso',
      'cómo vender',
      'pasos',
      'estrategia',
      'técnica',
    ];
    return guideKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword),
    );
  }

  private getSalesActions(message: string): string[] {
    const messageLower = message.toLowerCase();

    if (messageLower.includes('lead') || messageLower.includes('cliente')) {
      return ['Ver mis leads', 'Programar cita', 'Hacer seguimiento'];
    }
    if (messageLower.includes('lote') || messageLower.includes('disponib')) {
      return [
        'Ver lotes disponibles',
        'Consultar precios',
        'Generar cotización',
      ];
    }
    if (messageLower.includes('venta') || messageLower.includes('cerrar')) {
      return ['Registrar venta', 'Crear reserva', 'Enviar propuesta'];
    }

    return ['Ver mi pipeline', 'Consultar metas', 'Revisar actividades'];
  }

  private getSalesFeatures(message: string): string[] {
    const messageLower = message.toLowerCase();

    if (messageLower.includes('lead')) {
      return [
        'CRM de clientes',
        'Historial de contactos',
        'Notas de seguimiento',
      ];
    }
    if (messageLower.includes('lote')) {
      return [
        'Catálogo de lotes',
        'Calculadora de precios',
        'Planos del proyecto',
      ];
    }
    if (messageLower.includes('cotización')) {
      return [
        'Generador de propuestas',
        'Simulador financiero',
        'Plantillas comerciales',
      ];
    }

    return [
      'Dashboard de ventas',
      'Reportes de rendimiento',
      'Herramientas de seguimiento',
    ];
  }
}
