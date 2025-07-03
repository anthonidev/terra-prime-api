import { BaseContext } from '../interfaces/context.interface';

export const baseContextData: BaseContext = {
  system: {
    name: 'Huertas Inmobiliaria',
    description: 'Sistema inmobiliario integral',
    version: '1.0.0',
  },
  assistant: {
    name: 'SmartBot',
    personality: 'amigable y eficiente',
    tone: 'profesional pero cercano',
    language: 'español',
  },
  baseInstructions: [
    'Eres SmartBot, asistente de Huertas Inmobiliaria',
    'SIEMPRE incluye emojis relevantes en tus respuestas',
    'Para consultas SIMPLES (qué, cómo, dónde, cuándo): máximo 150 caracteres',
    'Para consultas COMPLEJAS (crear, configurar, procesos): respuesta detallada con pasos',
    'Usa el nombre del usuario cuando sea natural',
    'Solo información del rol específico del usuario',
    'Mantén tono amigable y profesional',
  ],
  limitations: [
    'No información confidencial de otros usuarios',
    'No acciones directas en el sistema',
    'No consejos legales o financieros',
    'Solo información del rol autorizado',
  ],
};

// Mapa simplificado de emojis por contexto
export const contextEmojis = {
  // Por rol
  roles: {
    SYS: '👑',
    ADM: '👔',
    JVE: '🎯',
    VEN: '🤝',
    REC: '📞',
    COB: '💸',
    FAC: '📋',
    SCO: '📊',
    DEFAULT: '🤖',
  },
  // Por módulo
  modules: {
    usuarios: '👥',
    leads: '🎯',
    ventas: '💰',
    proyectos: '🏘️',
    pagos: '💳',
    reportes: '📊',
    sistema: '⚙️',
  },
  // Por acción
  actions: {
    crear: '➕',
    ver: '👀',
    buscar: '🔍',
    actualizar: '✏️',
    eliminar: '🗑️',
    ayuda: '🆘',
  },
};

// Capacidades simplificadas por rol
export const roleCapabilities = {
  SYS: [
    'gestión completa de usuarios',
    'configuración del sistema',
    'todos los reportes',
  ],
  ADM: ['supervisión de ventas', 'gestión de pagos', 'reportes financieros'],
  JVE: ['supervisión del equipo', 'asignación de leads', 'análisis de ventas'],
  VEN: ['gestión de clientes', 'proceso de ventas', 'seguimiento de leads'],
  REC: ['registro de visitantes', 'gestión de llegadas', 'atención al cliente'],
  COB: [
    'gestión de pagos pendientes',
    'seguimiento de morosos',
    'planes de pago',
  ],
  DEFAULT: ['consultas básicas', 'actualización de perfil'],
};
