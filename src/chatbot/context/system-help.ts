import { SystemHelp } from '../interfaces/context.interface';

export const systemHelpData: SystemHelp = {
  quickHelp: {
    SYS: [
      '¿Cómo crear un nuevo usuario?',
      '¿Cómo configurar roles y permisos?',
      '¿Cómo gestionar proyectos?',
      '¿Cómo ver reportes del sistema?',
      '¿Cómo configurar fuentes de leads?',
    ],
    ADM: [
      '¿Cómo revisar ventas del período?',
      '¿Cómo gestionar pagos pendientes?',
      '¿Cómo generar reportes financieros?',
      '¿Cómo supervisar vendedores?',
      '¿Cómo administrar reservas?',
    ],
    REC: [
      '¿Cómo registrar un nuevo lead?',
      '¿Cómo marcar llegada de cliente?',
      '¿Cómo buscar cliente por documento?',
      '¿Cómo actualizar datos de visitante?',
      '¿Cómo registrar salida de cliente?',
    ],
    VEN: [
      '¿Cómo ver mis leads asignados?',
      '¿Cómo realizar una venta?',
      '¿Cómo consultar lotes disponibles?',
      '¿Cómo hacer seguimiento a cliente?',
      '¿Cómo agendar una cita?',
    ],
    JVE: [
      '¿Cómo ver rendimiento del equipo?',
      '¿Cómo asignar leads a vendedores?',
      '¿Cómo generar reportes de ventas?',
      '¿Cómo establecer metas?',
      '¿Cómo supervisar conversiones?',
    ],
    COB: [
      '¿Cómo revisar pagos pendientes?',
      '¿Cómo contactar clientes morosos?',
      '¿Cómo actualizar estado de pago?',
      '¿Cómo generar reporte de cobranza?',
      '¿Cómo programar recordatorios?',
    ],
    DEFAULT: [
      '¿Cómo funciona el sistema?',
      '¿Cómo actualizar mi perfil?',
      '¿Cómo contactar soporte?',
    ],
  },
  stepByStepGuides: {
    createUser: {
      title: 'Crear un nuevo usuario',
      applicableRoles: ['SYS'],
      steps: [
        'Acceder al módulo de Usuarios desde el menú principal',
        'Hacer clic en "Crear Usuario"',
        'Completar la información personal (nombre, apellido, email, documento)',
        'Asignar un rol del sistema',
        'Establecer una contraseña temporal',
        'Guardar el usuario',
        'Enviar credenciales al nuevo usuario',
      ],
    },
    registerLead: {
      title: 'Registrar un nuevo lead',
      applicableRoles: ['REC', 'SYS', 'ADM'],
      steps: [
        'Ir al módulo de Leads',
        'Hacer clic en "Registrar Lead"',
        'Ingresar información básica (nombre, documento, teléfono)',
        'Seleccionar fuente del lead',
        'Agregar observaciones si es necesario',
        'Marcar como "En oficina" si aplica',
        'Guardar el registro',
      ],
    },
    processPayment: {
      title: 'Procesar un pago',
      applicableRoles: ['COB', 'ADM', 'SYS'],
      steps: [
        'Acceder al módulo de Cobranzas',
        'Buscar el cliente por documento o nombre',
        'Seleccionar la cuota o pago pendiente',
        'Registrar el monto recibido',
        'Seleccionar método de pago',
        'Adjuntar comprobante si es necesario',
        'Confirmar el pago',
        'Generar recibo',
      ],
    },
  },
  troubleshooting: {
    commonIssues: [
      {
        issue: 'No puedo acceder al sistema',
        solutions: [
          'Verificar credenciales de acceso',
          'Confirmar que el usuario esté activo',
          'Contactar al administrador del sistema',
          'Verificar conexión a internet',
        ],
      },
      {
        issue: 'No veo todas las opciones del menú',
        solutions: [
          'Verificar permisos del rol asignado',
          'Contactar al administrador para revisar permisos',
          'Cerrar sesión y volver a iniciar',
          'Limpiar caché del navegador',
        ],
      },
      {
        issue: 'Error al guardar información',
        solutions: [
          'Verificar que todos los campos obligatorios estén completos',
          'Revisar formato de datos (email, teléfono, etc.)',
          'Intentar nuevamente en unos minutos',
          'Contactar soporte técnico si persiste',
        ],
      },
    ],
  },
};
