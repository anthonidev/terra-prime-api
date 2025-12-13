import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiQuery,
} from '@nestjs/swagger';

export function ApiValidateExcel() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Validar archivo Excel de proyecto',
      description:
        'Valida un archivo Excel con la estructura de lotes para importación masiva. Verifica formato, duplicados y valores requeridos.',
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'Archivo Excel (.xlsx o .xls) con máximo 10MB',
          },
        },
        required: ['file'],
      },
    }),
    ApiOkResponse({
      description: 'Validación completada',
      schema: {
        type: 'object',
        properties: {
          isValid: { type: 'boolean' },
          errors: { type: 'array', items: { type: 'object' } },
          summary: {
            type: 'object',
            properties: {
              totalLots: { type: 'number' },
              validLots: { type: 'number' },
              invalidLots: { type: 'number' },
              duplicateGroups: { type: 'number' },
              totalDuplicates: { type: 'number' },
            },
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Archivo inválido o no proporcionado',
    }),
  );
}

export function ApiUploadProject() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Cargar proyecto desde Excel',
      description:
        'Crea un proyecto completo con etapas, manzanas y lotes desde un archivo Excel previamente validado.',
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'Archivo Excel validado con datos del proyecto',
          },
        },
        required: ['file'],
      },
    }),
    ApiCreatedResponse({
      description: 'Proyecto creado exitosamente',
    }),
    ApiBadRequestResponse({
      description: 'Datos inválidos en el archivo',
    }),
    ApiConflictResponse({
      description: 'Ya existe un proyecto con ese nombre',
    }),
  );
}

export function ApiFindAllProjects() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Listar todos los proyectos',
      description:
        'Obtiene la lista de todos los proyectos con sus estadísticas de lotes.',
    }),
    ApiOkResponse({
      description: 'Lista de proyectos obtenida exitosamente',
      schema: {
        type: 'object',
        properties: {
          items: { type: 'array' },
          totalItems: { type: 'number' },
        },
      },
    }),
  );
}

export function ApiFindProjectById() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Obtener proyecto por ID',
      description:
        'Obtiene los detalles completos de un proyecto incluyendo etapas, manzanas y lotes.',
    }),
    ApiOkResponse({
      description: 'Proyecto encontrado',
    }),
    ApiInternalServerErrorResponse({
      description: 'Error al obtener el proyecto',
    }),
  );
}

export function ApiFindProjectLots() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Listar lotes de un proyecto',
      description:
        'Obtiene una lista paginada de lotes con filtros por etapa, manzana y estado.',
    }),
    ApiQuery({ name: 'page', required: false, type: Number }),
    ApiQuery({ name: 'limit', required: false, type: Number }),
    ApiQuery({ name: 'stageId', required: false, type: String }),
    ApiQuery({ name: 'blockId', required: false, type: String }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: ['AVAILABLE', 'RESERVED', 'SOLD'],
    }),
    ApiQuery({ name: 'search', required: false, type: String }),
    ApiOkResponse({
      description: 'Lista paginada de lotes',
    }),
  );
}

export function ApiUpdateProject() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Actualizar proyecto',
      description: 'Actualiza la información básica de un proyecto.',
    }),
    ApiOkResponse({
      description: 'Proyecto actualizado exitosamente',
    }),
    ApiBadRequestResponse({
      description: 'Datos de entrada inválidos',
    }),
  );
}
