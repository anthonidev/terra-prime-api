import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';

export function ApiCreateStage() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Crear nueva etapa',
      description: 'Crea una nueva etapa dentro de un proyecto.',
    }),
    ApiCreatedResponse({
      description: 'Etapa creada exitosamente',
    }),
    ApiNotFoundResponse({
      description: 'Proyecto no encontrado',
    }),
    ApiConflictResponse({
      description: 'Ya existe una etapa con ese nombre en el proyecto',
    }),
  );
}

export function ApiUpdateStage() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Actualizar etapa',
      description: 'Actualiza la información de una etapa existente.',
    }),
    ApiOkResponse({
      description: 'Etapa actualizada exitosamente',
    }),
    ApiNotFoundResponse({
      description: 'Etapa no encontrada',
    }),
    ApiConflictResponse({
      description: 'Ya existe otra etapa con ese nombre',
    }),
  );
}

export function ApiFindStageById() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Obtener etapa por ID',
      description:
        'Obtiene los detalles completos de una etapa incluyendo sus manzanas y lotes.',
    }),
    ApiOkResponse({
      description: 'Etapa encontrada',
    }),
    ApiNotFoundResponse({
      description: 'Etapa no encontrada',
    }),
  );
}
