import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

export function ApiRequestPasswordReset() {
  return applyDecorators(
    ApiOperation({
      summary: 'Solicitar restablecimiento de contraseña',
      description:
        'Endpoint público que envía un correo electrónico con un enlace para restablecer la contraseña. Por seguridad, siempre retorna el mismo mensaje independientemente de si el email existe.',
    }),
    ApiBody({
      description: 'Email del usuario que solicita restablecer su contraseña',
      schema: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'usuario@ejemplo.com',
          },
        },
        required: ['email'],
      },
    }),
    ApiOkResponse({
      description: 'Solicitud procesada correctamente',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: {
            type: 'string',
            example:
              'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña',
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Error al procesar la solicitud',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'string',
            example:
              'No se pudo procesar la solicitud de restablecimiento de contraseña',
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
  );
}

export function ApiVerifyResetToken() {
  return applyDecorators(
    ApiOperation({
      summary: 'Verificar token de restablecimiento',
      description:
        'Endpoint público que valida si un token de restablecimiento es válido, no ha sido usado y no ha expirado.',
    }),
    ApiParam({
      name: 'token',
      description: 'Token UUID de restablecimiento de contraseña',
      type: 'string',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiOkResponse({
      description: 'Token válido',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Token válido' },
          email: { type: 'string', example: 'usuario@ejemplo.com' },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Token no encontrado',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: {
            type: 'string',
            example: 'Token de restablecimiento no encontrado o inválido',
          },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Token expirado o ya utilizado',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: {
            type: 'string',
            example: 'El token ha expirado',
          },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
  );
}

export function ApiResetPassword() {
  return applyDecorators(
    ApiOperation({
      summary: 'Restablecer contraseña',
      description:
        'Endpoint público que restablece la contraseña del usuario utilizando un token válido. Marca el token como usado una vez completado.',
    }),
    ApiParam({
      name: 'token',
      description: 'Token UUID de restablecimiento de contraseña',
      type: 'string',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiBody({
      description: 'Nueva contraseña del usuario',
      schema: {
        type: 'object',
        properties: {
          password: {
            type: 'string',
            example: 'NewPassword123!',
            description: 'Nueva contraseña del usuario',
          },
        },
        required: ['password'],
      },
    }),
    ApiOkResponse({
      description: 'Contraseña restablecida correctamente',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: {
            type: 'string',
            example: 'Contraseña actualizada correctamente',
          },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Token no encontrado',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: {
            type: 'string',
            example: 'Token de restablecimiento no encontrado o inválido',
          },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Token expirado o ya utilizado',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: {
            type: 'string',
            example: 'Este token ya ha sido utilizado',
          },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
  );
}
