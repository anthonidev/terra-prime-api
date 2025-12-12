import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiOkResponse,
  ApiBody,
  ApiBearerAuth,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

export function ApiChangePassword() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Cambiar contraseña',
      description:
        'Permite al usuario autenticado cambiar su contraseña actual por una nueva. Requiere proporcionar la contraseña actual para validación.',
    }),
    ApiBody({
      description: 'Datos para cambio de contraseña',
      schema: {
        type: 'object',
        properties: {
          currentPassword: {
            type: 'string',
            example: 'OldPassword123!',
            description: 'Contraseña actual del usuario',
          },
          newPassword: {
            type: 'string',
            example: 'NewPassword123!',
            description: 'Nueva contraseña (debe ser diferente a la actual)',
          },
        },
        required: ['currentPassword', 'newPassword'],
      },
    }),
    ApiOkResponse({
      description: 'Contraseña actualizada correctamente',
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
    ApiUnauthorizedResponse({
      description: 'La contraseña actual es incorrecta',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: {
            type: 'string',
            example: 'La contraseña actual es incorrecta',
          },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Usuario no encontrado',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Usuario no encontrado' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'La nueva contraseña debe ser diferente a la actual',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'string',
            example: 'La nueva contraseña debe ser diferente a la actual',
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
  );
}
