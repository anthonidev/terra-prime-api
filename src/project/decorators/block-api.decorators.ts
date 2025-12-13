import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';

export function ApiCreateBlock() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Crear nueva manzana',
      description: 'Crea una nueva manzana dentro de una etapa.',
    }),
    ApiCreatedResponse({
      description: 'Manzana creada exitosamente',
    }),
    ApiNotFoundResponse({
      description: 'Etapa no encontrada',
    }),
    ApiConflictResponse({
      description: 'Ya existe una manzana con ese nombre en la etapa',
    }),
  );
}

export function ApiUpdateBlock() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Actualizar manzana',
      description: 'Actualiza la información de una manzana existente.',
    }),
    ApiOkResponse({
      description: 'Manzana actualizada exitosamente',
    }),
    ApiNotFoundResponse({
      description: 'Manzana no encontrada',
    }),
    ApiConflictResponse({
      description: 'Ya existe otra manzana con ese nombre',
    }),
  );
}

export function ApiFindBlockById() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Obtener manzana por ID',
      description:
        'Obtiene los detalles completos de una manzana incluyendo sus lotes.',
    }),
    ApiOkResponse({
      description: 'Manzana encontrada',
    }),
    ApiNotFoundResponse({
      description: 'Manzana no encontrada',
    }),
  );
}
