import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiParam,
} from '@nestjs/swagger';

export function ApiCreateLot() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Crear nuevo lote',
      description: 'Crea un nuevo lote dentro de una manzana.',
    }),
    ApiCreatedResponse({
      description: 'Lote creado exitosamente',
    }),
    ApiNotFoundResponse({
      description: 'Manzana no encontrada',
    }),
    ApiConflictResponse({
      description: 'Ya existe un lote con ese nombre en la manzana',
    }),
  );
}

export function ApiUpdateLot() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Actualizar lote',
      description: 'Actualiza la información de un lote existente.',
    }),
    ApiOkResponse({
      description: 'Lote actualizado exitosamente',
    }),
    ApiNotFoundResponse({
      description: 'Lote no encontrado',
    }),
    ApiConflictResponse({
      description: 'Ya existe otro lote con ese nombre',
    }),
  );
}

export function ApiFindLotById() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Obtener lote por ID',
      description: 'Obtiene los detalles completos de un lote específico.',
    }),
    ApiOkResponse({
      description: 'Lote encontrado',
    }),
    ApiNotFoundResponse({
      description: 'Lote no encontrado',
    }),
  );
}

export function ApiGetActiveTokenInfo() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Obtener información del token administrativo activo',
      description:
        'Retorna la información del token (PIN) administrativo actualmente activo para modificación de precios.',
    }),
    ApiOkResponse({
      description: 'Información del token obtenida',
      schema: {
        type: 'object',
        properties: {
          hasActiveToken: { type: 'boolean' },
          token: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time', nullable: true },
          expiresAt: { type: 'string', format: 'date-time', nullable: true },
          createdBy: { type: 'string', nullable: true },
        },
      },
    }),
  );
}

export function ApiCreatePricePin() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Crear PIN administrativo',
      description:
        'Genera un nuevo PIN de 6 dígitos para permitir modificaciones de precios. Solo gerentes de ventas.',
    }),
    ApiCreatedResponse({
      description: 'PIN creado exitosamente',
      schema: {
        type: 'object',
        properties: {
          token: { type: 'string', example: '123456' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
    }),
    ApiConflictResponse({
      description: 'Ya existe un token activo',
    }),
  );
}

export function ApiValidateToken() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Validar token administrativo',
      description: 'Valida si un PIN es válido y está activo.',
    }),
    ApiParam({
      name: 'token',
      description: 'PIN de 6 dígitos',
      example: '123456',
    }),
    ApiOkResponse({
      description: 'Token validado',
      schema: {
        type: 'object',
        properties: {
          isValid: { type: 'boolean' },
          message: { type: 'string' },
        },
      },
    }),
  );
}
