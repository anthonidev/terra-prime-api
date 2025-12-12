import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBody,
} from '@nestjs/swagger';

export function ApiRegisterUser() {
  return applyDecorators(
    ApiOperation({
      summary: 'Registrar nuevo usuario',
      description:
        'Endpoint público para registrar un nuevo usuario en el sistema.',
    }),
    ApiBody({
      description: 'Datos del nuevo usuario',
      schema: {
        type: 'object',
        properties: {
          email: { type: 'string', example: 'usuario@ejemplo.com' },
          password: { type: 'string', example: 'Password123!' },
          firstName: { type: 'string', example: 'Juan' },
          lastName: { type: 'string', example: 'Pérez' },
          document: { type: 'string', example: '12345678' },
          roleId: { type: 'number', example: 1 },
        },
        required: ['email', 'password', 'firstName', 'lastName', 'document'],
      },
    }),
    ApiCreatedResponse({
      description: 'Usuario registrado exitosamente',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          document: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Datos de entrada inválidos',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'El email ya está registrado' },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
  );
}

export function ApiLoginUser() {
  return applyDecorators(
    ApiOperation({
      summary: 'Iniciar sesión',
      description:
        'Endpoint público para autenticación de usuarios. Retorna tokens de acceso y refresh.',
    }),
    ApiBody({
      description: 'Credenciales de acceso',
      schema: {
        type: 'object',
        properties: {
          document: { type: 'string', example: '12345678' },
          password: { type: 'string', example: 'Password123!' },
        },
        required: ['document', 'password'],
      },
    }),
    ApiOkResponse({
      description:
        'Login exitoso. Copia el accessToken y úsalo en el botón "Authorize" para autenticar las siguientes peticiones.',
      schema: {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: '550e8400-e29b-41d4-a716-446655440000',
              },
              email: { type: 'string', example: 'usuario@ejemplo.com' },
              firstName: { type: 'string', example: 'Juan' },
              lastName: { type: 'string', example: 'Pérez' },
              fullName: { type: 'string', example: 'Juan Pérez' },
              document: { type: 'string', example: '12345678' },
              photo: {
                type: 'string',
                nullable: true,
                example: 'https://example.com/photo.jpg',
              },
              role: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 1 },
                  code: { type: 'string', example: 'ADMIN' },
                  name: { type: 'string', example: 'Administrador' },
                },
              },
            },
          },
          accessToken: {
            type: 'string',
            example:
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6eyJpZCI6MSwiY29kZSI6IkFETUlOIiwibmFtZSI6IkFkbWluaXN0cmFkb3IifSwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
            description:
              '⚠️ Token de acceso (válido por 24h). Cópialo y pégalo en el botón "Authorize" 🔑',
          },
          refreshToken: {
            type: 'string',
            example:
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyfQ.kRV8KwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5x',
            description: 'Token de renovación (válido por 7 días)',
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Credenciales inválidas o rol inactivo',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Unauthorized' },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
  );
}

export function ApiRefreshToken() {
  return applyDecorators(
    ApiOperation({
      summary: 'Renovar token de acceso',
      description:
        'Utiliza el refresh token para obtener un nuevo access token sin necesidad de volver a autenticarse.',
    }),
    ApiBody({
      description: 'Refresh token válido',
      schema: {
        type: 'object',
        properties: {
          refreshToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            description: 'Refresh token obtenido en el login',
          },
        },
        required: ['refreshToken'],
      },
    }),
    ApiBody({
      description: 'Refresh token válido',
      schema: {
        type: 'object',
        properties: {
          refreshToken: { type: 'string' },
        },
        required: ['refreshToken'],
      },
    }),
    ApiOkResponse({
      description: 'Token renovado exitosamente',
      schema: {
        type: 'object',
        properties: {
          user: { type: 'object' },
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Refresh token inválido o expirado',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Unauthorized' },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
  );
}
