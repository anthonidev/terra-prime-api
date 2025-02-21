export const rolData = [
  {
    name: 'Sistema',
    code: 'SYS',
    views: ['PROFILE', 'G_PROJECT', 'PROJECT', 'LOTE', 'LEAD', 'USER'],
  },
  {
    name: 'Recepción',
    code: 'REC',
    views: ['PROFILE', 'LEAD'],
  },
  {
    name: 'Gerente de ventas',
    code: 'GVE',
    views: ['PROFILE', 'G_PROJECT', 'PROJECT', 'LOTE'],
  },
  {
    name: 'Ventas',
    code: 'VEN',
    views: ['PROFILE', 'G_PROJECT', 'PROJECT', 'LOTE'],
  },
  {
    name: 'Supervisor de Cobranza',
    code: 'SCO',
    views: ['PROFILE'],
  },
  {
    name: 'Cobranza',
    code: 'COB',
    views: ['PROFILE'],
  },
  {
    name: 'Finanzas',
    code: 'FIN',
    views: ['PROFILE'],
  },
  {
    name: 'Administrador',
    code: 'ADM',
    views: ['PROFILE'],
  },
];

export const vistaData = [
  {
    name: 'Perfil',
    url: '/perfil',
    order: 1,
    icon: 'profile',
    code: 'PROFILE',
    children: null,
    parent: null,
  },

  {
    name: 'Gestión de Proyectos',
    url: null,
    order: 2,
    icon: 'g-project',
    code: 'G_PROJECT',
    parent: null,
    children: [
      {
        name: 'Proyectos',
        url: '/proyectos',
        order: 1,
        icon: 'project',
        code: 'PROJECT',
        children: null,
        parent: 'G_PROJECT',
      },
      {
        name: 'Lotes',
        url: '/lotes',
        order: 2,
        icon: 'lote',
        code: 'LOTE',
        children: null,
        parent: 'G_PROJECT',
      },
    ],
  },

  {
    name: 'Leads',
    url: '/',
    order: 3,
    icon: 'lead',
    children: null,
    parent: null,
    code: 'LEAD',
  },
  {
    name: 'Usuarios',
    url: '/usuarios',
    order: 3,
    icon: 'user',
    parent: null,
    children: null,
    code: 'USER',
  },
];
