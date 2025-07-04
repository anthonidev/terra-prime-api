import { RoleContext } from '../interfaces/context.interface';

export const rolesContextData: Record<string, RoleContext> = {
  SYS: {
    name: 'Administrador del Sistema',
    description:
      'Usuario con acceso completo al sistema para configuración y administración general',
    capabilities: [
      'Gestión completa de usuarios (crear, editar, desactivar)',
      'Configuración de roles y permisos del sistema',
      'Gestión de proyectos inmobiliarios',
      'Configuración global del sistema',
      'Acceso a todos los reportes y estadísticas',
      'Gestión de fuentes de leads',
      'Configuración de ubigeos y geografía',
      'Administración de la plataforma',
    ],
    commonQueries: [
      '¿Cómo crear un nuevo usuario en el sistema?',
      '¿Cómo configurar roles y asignar permisos?',
      '¿Cómo crear y gestionar proyectos inmobiliarios?',
      '¿Cómo acceder a los reportes del sistema?',
      '¿Cómo configurar nuevas fuentes de leads?',
      '¿Cómo gestionar la configuración del sistema?',
      '¿Cómo supervisar el rendimiento general?',
      '¿Cómo realizar copias de seguridad?',
    ],
    workflows: [
      'Creación de usuarios → Asignación de roles → Configuración de permisos',
      'Nuevo proyecto → Configuración de lotes → Asignación de precios',
      'Configuración de fuentes → Validación de leads → Análisis de conversión',
    ],
  },
  ADM: {
    name: 'Administrador',
    description:
      'Usuario con acceso administrativo para gestión de ventas, pagos y operaciones comerciales',
    capabilities: [
      'Supervisión completa de ventas y transacciones',
      'Administración de pagos y cobranzas',
      'Generación de reportes financieros y comerciales',
      'Gestión de reservas y contratos',
      'Supervisión de leads y conversiones',
      'Administración de lotes y disponibilidad',
      'Control de metas y objetivos comerciales',
    ],
    commonQueries: [
      '¿Cómo revisar las ventas del período actual?',
      '¿Cómo gestionar pagos pendientes y morosos?',
      '¿Cómo generar reportes financieros detallados?',
      '¿Cómo supervisar el rendimiento de vendedores?',
      '¿Cómo administrar reservas y cancelaciones?',
      '¿Cómo analizar la conversión de leads?',
      '¿Cómo establecer metas comerciales?',
      '¿Cómo gestionar descuentos y promociones?',
    ],
    workflows: [
      'Análisis de ventas → Identificación de oportunidades → Estrategias de mejora',
      'Revisión de pagos → Gestión de morosos → Planes de cobranza',
      'Evaluación de vendedores → Asignación de leads → Seguimiento de resultados',
    ],
  },
  REC: {
    name: 'Recepción',
    description:
      'Usuario encargado del registro y atención de visitantes, gestión de leads entrantes',
    capabilities: [
      'Registro de nuevos leads y visitantes',
      'Gestión de llegadas y salidas de la oficina',
      'Actualización de información de clientes',
      'Búsqueda y consulta de datos de visitantes',
      'Gestión de citas y horarios',
      'Registro de visitas y seguimiento básico',
    ],
    commonQueries: [
      '¿Cómo registrar un nuevo lead que llega a la oficina?',
      '¿Cómo marcar la llegada de un cliente?',
      '¿Cómo buscar un cliente por su documento?',
      '¿Cómo actualizar los datos de un visitante?',
      '¿Cómo registrar la salida de un cliente?',
      '¿Cómo programar una cita?',
      '¿Cómo verificar si un cliente está en la oficina?',
      '¿Cómo gestionar la lista de espera?',
    ],
    workflows: [
      'Llegada del cliente → Verificación de datos → Registro en sistema → Notificación a vendedor',
      'Nuevo lead → Captura de información → Asignación inicial → Programación de seguimiento',
      'Consulta telefónica → Búsqueda en sistema → Información básica → Transferencia si necesario',
    ],
  },
  VEN: {
    name: 'Vendedor',
    description:
      'Usuario encargado de la venta directa, seguimiento de clientes y cierre de negocios',
    capabilities: [
      'Gestión de cartera de clientes asignados',
      'Proceso completo de ventas y reservas',
      'Seguimiento detallado de leads',
      'Gestión de citas con clientes',
      'Consulta de disponibilidad de lotes',
      'Generación de cotizaciones',
      'Registro de actividades comerciales',
    ],
    commonQueries: [
      '¿Cómo consultar mis leads asignados?',
      '¿Cómo realizar una venta paso a paso?',
      '¿Cómo hacer seguimiento efectivo a un cliente?',
      '¿Qué lotes están disponibles para venta?',
      '¿Cómo generar una cotización?',
      '¿Cómo programar visitas al proyecto?',
      '¿Cómo actualizar el estado de un cliente?',
      '¿Cómo registrar una reserva?',
    ],
    workflows: [
      'Lead asignado → Contacto inicial → Presentación → Visita → Negociación → Cierre',
      'Cliente interesado → Cotización → Seguimiento → Reserva → Venta',
      'Consulta de lotes → Verificación de disponibilidad → Presentación → Propuesta',
    ],
  },
  JVE: {
    name: 'Jefe de Ventas',
    description:
      'Usuario supervisor del equipo comercial, gestión de estrategias y metas de venta',
    capabilities: [
      'Supervisión integral del equipo de ventas',
      'Análisis de rendimiento y productividad',
      'Asignación estratégica de leads',
      'Establecimiento de metas y objetivos',
      'Análisis de conversiones y embudo de ventas',
      'Coaching y desarrollo del equipo',
      'Reportes gerenciales de ventas',
    ],
    commonQueries: [
      '¿Cómo evaluar el rendimiento de mi equipo de ventas?',
      '¿Cómo asignar leads de manera eficiente?',
      '¿Cómo generar reportes de productividad?',
      '¿Cómo establecer metas realistas para el equipo?',
      '¿Cómo analizar las tasas de conversión?',
      '¿Cómo identificar oportunidades de mejora?',
      '¿Cómo gestionar el pipeline de ventas?',
      '¿Cómo motivar al equipo comercial?',
    ],
    workflows: [
      'Análisis de rendimiento → Identificación de brechas → Plan de acción → Seguimiento',
      'Recepción de leads → Evaluación → Asignación estratégica → Monitoreo de resultados',
      'Establecimiento de metas → Comunicación al equipo → Seguimiento semanal → Evaluación mensual',
    ],
  },
  COB: {
    name: 'Cobranzas',
    description:
      'Usuario especializado en gestión de pagos, cobranzas y seguimiento financiero',
    capabilities: [
      'Gestión integral de pagos pendientes',
      'Seguimiento de clientes morosos',
      'Generación de reportes de cobranza',
      'Actualización de estados de pago',
      'Gestión de planes de pago',
      'Comunicación con clientes sobre pagos',
      'Análisis de cartera vencida',
    ],
    commonQueries: [
      '¿Cómo revisar la cartera de pagos pendientes?',
      '¿Cómo contactar efectivamente a clientes morosos?',
      '¿Cómo actualizar el estado de un pago?',
      '¿Cómo generar reportes de cobranza?',
      '¿Cómo establecer planes de pago personalizados?',
      '¿Cómo programar recordatorios de pago?',
      '¿Cómo analizar la morosidad por período?',
      '¿Cómo gestionar casos de cobranza difícil?',
    ],
    workflows: [
      'Identificación de morosos → Contacto inicial → Negociación → Plan de pago → Seguimiento',
      'Reporte de cobranza → Análisis de tendencias → Estrategias de mejora → Implementación',
      'Cliente con atraso → Comunicación → Opciones de pago → Acuerdo → Monitoreo',
    ],
  },
  DEFAULT: {
    name: 'Usuario General',
    description: 'Usuario con acceso básico al sistema',
    capabilities: [
      'Consultas generales sobre el funcionamiento del sistema',
      'Actualización de perfil personal',
      'Acceso a información básica',
      'Solicitudes de soporte',
    ],
    commonQueries: [
      '¿Cómo funciona el sistema en general?',
      '¿Cómo actualizar mi información personal?',
      '¿Cómo cambiar mi contraseña?',
      '¿Cómo contactar al soporte técnico?',
      '¿Cuáles son las funciones disponibles para mi rol?',
    ],
    workflows: [
      'Consulta general → Información básica → Referencia a recursos → Soporte si necesario',
    ],
  },
};
