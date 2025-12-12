import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

/**
 * Documentación API para endpoint de creación de usuario
 */
export function ApiCreateUser() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Crear nuevo usuario',
      description:
        'Crea un nuevo usuario en el sistema. Solo accesible por usuarios con rol SYS (administrador).',
    }),
    ApiResponse({
      status: 201,
      description: 'Usuario creado exitosamente',
      schema: {
        example: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'juan.perez@example.com',
          firstName: 'Juan Carlos',
          lastName: 'Pérez García',
          document: '72345678',
          photo: 'https://example.com/photo.jpg',
          isActive: true,
          role: {
            id: 1,
            code: 'VEN',
            name: 'Vendedor',
          },
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-01-15T10:30:00.000Z',
          fullName: 'Juan Carlos Pérez García',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Datos de entrada inválidos',
    }),
    ApiResponse({
      status: 409,
      description: 'El email o documento ya existe',
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
 * Documentación API para endpoint de listado de usuarios
 */
export function ApiFindAllUsers() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Listar usuarios',
      description:
        'Obtiene una lista paginada de usuarios con filtros opcionales. Excluye al usuario actual de los resultados.',
    }),
    ApiResponse({
      status: 200,
      description: 'Lista de usuarios obtenida exitosamente',
      schema: {
        example: {
          items: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              email: 'juan.perez@example.com',
              firstName: 'Juan',
              lastName: 'Pérez',
              document: '72345678',
              photo: null,
              isActive: true,
              role: {
                id: 1,
                code: 'VEN',
                name: 'Vendedor',
              },
              createdAt: '2024-01-15T10:30:00.000Z',
              updatedAt: '2024-01-15T10:30:00.000Z',
              lastLoginAt: '2024-01-20T08:15:00.000Z',
            },
          ],
          meta: {
            totalItems: 100,
            itemCount: 10,
            itemsPerPage: 10,
            totalPages: 10,
            currentPage: 1,
          },
        },
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

/**
 * Documentación API para endpoint de actualización de usuario
 */
export function ApiUpdateUser() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Actualizar usuario',
      description:
        'Actualiza la información de un usuario existente. Todos los campos son opcionales.',
    }),
    ApiResponse({
      status: 200,
      description: 'Usuario actualizado exitosamente',
      schema: {
        example: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'juan.perez@example.com',
          firstName: 'Juan Carlos',
          lastName: 'Pérez García',
          document: '72345678',
          photo: 'https://example.com/photo.jpg',
          isActive: true,
          role: {
            id: 2,
            code: 'JVE',
            name: 'Jefe de Ventas',
          },
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-01-20T14:45:00.000Z',
          fullName: 'Juan Carlos Pérez García',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Datos de entrada inválidos',
    }),
    ApiResponse({
      status: 404,
      description: 'Usuario no encontrado',
    }),
    ApiResponse({
      status: 409,
      description: 'El email o documento ya existe',
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
 * Documentación API para endpoint de menú de usuario
 */
export function ApiGetUserMenu() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Obtener menú del usuario',
      description:
        'Retorna el menú/vistas a las que el usuario tiene acceso según su rol.',
    }),
    ApiResponse({
      status: 200,
      description: 'Menú obtenido exitosamente',
      schema: {
        example: {
          views: [
            {
              id: 1,
              code: 'DASHBOARD',
              name: 'Dashboard',
              icon: 'dashboard',
              url: '/dashboard',
              order: 0,
              metadata: null,
              children: [],
            },
            {
              id: 2,
              code: 'VENTAS',
              name: 'Ventas',
              icon: 'shopping_cart',
              url: null,
              order: 1,
              metadata: null,
              children: [
                {
                  id: 3,
                  code: 'VENTAS_LISTA',
                  name: 'Lista de Ventas',
                  icon: null,
                  url: '/ventas/lista',
                  order: 0,
                  metadata: null,
                  children: [],
                },
              ],
            },
          ],
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'No autenticado',
    }),
    ApiResponse({
      status: 404,
      description: 'Rol no encontrado o usuario sin rol asignado',
    }),
  );
}
