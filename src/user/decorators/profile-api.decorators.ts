import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';

/**
 * Documentación API para endpoint de obtener perfil del usuario
 */
export function ApiGetProfile() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Obtener perfil del usuario',
      description:
        'Retorna la información completa del perfil del usuario autenticado.',
    }),
    ApiResponse({
      status: 200,
      description: 'Perfil obtenido exitosamente',
      schema: {
        example: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'juan.perez@example.com',
          firstName: 'Juan',
          lastName: 'Pérez',
          fullName: 'Juan Pérez',
          document: '72345678',
          photo: 'https://example.com/photo.jpg',
          role: {
            id: 1,
            code: 'VEN',
            name: 'Vendedor',
          },
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-01-15T10:30:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'No autenticado',
    }),
    ApiResponse({
      status: 404,
      description: 'Usuario no encontrado',
    }),
  );
}

/**
 * Documentación API para endpoint de actualizar foto de perfil
 */
export function ApiUpdatePhoto() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Actualizar foto de perfil',
      description:
        'Permite al usuario subir una nueva foto de perfil. Formato: JPG, PNG. Máximo 5MB.',
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          photo: {
            type: 'string',
            format: 'binary',
            description: 'Archivo de imagen (JPG, PNG, máximo 5MB)',
          },
        },
        required: ['photo'],
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Foto actualizada exitosamente',
      schema: {
        example: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          photo: 'https://s3.amazonaws.com/bucket/profile-photos/123.jpg',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Archivo inválido o demasiado grande',
    }),
    ApiResponse({
      status: 401,
      description: 'No autenticado',
    }),
    ApiResponse({
      status: 404,
      description: 'Usuario no encontrado',
    }),
  );
}

/**
 * Documentación API para endpoint de actualizar perfil
 */
export function ApiUpdateProfile() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Actualizar perfil del usuario',
      description:
        'Permite al usuario actualizar su información personal (nombre, apellido, email).',
    }),
    ApiResponse({
      status: 200,
      description: 'Perfil actualizado exitosamente',
      schema: {
        example: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'juan.nuevo@example.com',
          firstName: 'Juan Carlos',
          lastName: 'Pérez García',
          fullName: 'Juan Carlos Pérez García',
          document: '72345678',
          photo: 'https://example.com/photo.jpg',
          role: {
            id: 1,
            code: 'VEN',
            name: 'Vendedor',
          },
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-01-20T14:30:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Datos inválidos',
    }),
    ApiResponse({
      status: 401,
      description: 'No autenticado',
    }),
    ApiResponse({
      status: 404,
      description: 'Usuario no encontrado',
    }),
    ApiResponse({
      status: 409,
      description: 'El correo electrónico ya está en uso',
    }),
  );
}
