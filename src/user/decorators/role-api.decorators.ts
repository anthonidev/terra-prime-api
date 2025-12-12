import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

/**
 * Documentación API para endpoint de listado de roles
 */
export function ApiFindAllRoles() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Listar roles',
      description: 'Obtiene la lista de todos los roles activos del sistema.',
    }),
    ApiResponse({
      status: 200,
      description: 'Lista de roles obtenida exitosamente',
      schema: {
        example: [
          {
            id: 1,
            code: 'SYS',
            name: 'Administrador del Sistema',
          },
          {
            id: 2,
            code: 'VEN',
            name: 'Vendedor',
          },
          {
            id: 3,
            code: 'JVE',
            name: 'Jefe de Ventas',
          },
          {
            id: 4,
            code: 'COB',
            name: 'Cobrador',
          },
        ],
      },
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
