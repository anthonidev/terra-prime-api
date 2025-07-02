export interface RateLimitConfig {
  maxRequestsPerHour: number;
  blockDurationMinutes: number;
  warningThreshold: number; // % del límite para mostrar advertencia
}

export const ROLE_RATE_LIMITS: Record<string, RateLimitConfig> = {
  SYS: {
    maxRequestsPerHour: 100, // Admin del sistema - límite alto
    blockDurationMinutes: 15,
    warningThreshold: 80,
  },
  ADM: {
    maxRequestsPerHour: 80, // Administrador - límite alto
    blockDurationMinutes: 20,
    warningThreshold: 80,
  },
  JVE: {
    maxRequestsPerHour: 60, // Jefe de ventas - límite medio-alto
    blockDurationMinutes: 30,
    warningThreshold: 85,
  },
  VEN: {
    maxRequestsPerHour: 40, // Vendedor - límite medio
    blockDurationMinutes: 30,
    warningThreshold: 85,
  },
  REC: {
    maxRequestsPerHour: 50, // Recepción - límite medio (mucha interacción)
    blockDurationMinutes: 25,
    warningThreshold: 85,
  },
  COB: {
    maxRequestsPerHour: 30, // Cobranzas - límite medio-bajo
    blockDurationMinutes: 45,
    warningThreshold: 90,
  },
  SCO: {
    maxRequestsPerHour: 30, // Supervisor de cobranzas - límite medio-bajo
    blockDurationMinutes: 45,
    warningThreshold: 90,
  },
  FAC: {
    maxRequestsPerHour: 30, // Facturación - límite medio-bajo
    blockDurationMinutes: 45,
    warningThreshold: 90,
  },
  DEFAULT: {
    maxRequestsPerHour: 20, // Usuarios sin rol específico
    blockDurationMinutes: 60,
    warningThreshold: 90,
  },
};

export const getRateLimitConfig = (roleCode: string): RateLimitConfig => {
  return ROLE_RATE_LIMITS[roleCode] || ROLE_RATE_LIMITS.DEFAULT;
};
