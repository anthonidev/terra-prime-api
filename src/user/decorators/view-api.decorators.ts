import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

/**
 * Documentación API para endpoint de eliminación de todas las vistas
 */
export function ApiDeleteAllViews() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Eliminar todas las vistas',
      description:
        'Elimina todas las vistas del sistema. PRECAUCIÓN: Esta operación es irreversible.',
    }),
    ApiResponse({
      status: 200,
      description: 'Vistas eliminadas exitosamente',
    }),
    ApiResponse({
      status: 404,
      description: 'No hay vistas para eliminar',
    }),
    ApiResponse({
      status: 401,
      description: 'No autenticado',
    }),
    ApiResponse({
      status: 403,
      description: 'No autorizado (requiere rol SYS)',
    }),
  );
}

/**
 * Documentación API para endpoint de asignación de vistas a un rol
 */
export function ApiAssignViewsToRole() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Asignar vistas a un rol',
      description:
        'Asigna un conjunto de vistas (menú) a un rol específico. Las vistas se crean o actualizan automáticamente.',
    }),
    ApiResponse({
      status: 201,
      description: 'Vistas asignadas exitosamente',
      schema: {
        example: {
          message: 'Vistas asignadas exitosamente al rol',
          role: {
            id: 1,
            code: 'VEN',
            name: 'Vendedor',
          },
          viewsAssigned: 5,
          processedViews: {
            created: 3,
            updated: 2,
          },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Rol no encontrado',
    }),
  );
}
