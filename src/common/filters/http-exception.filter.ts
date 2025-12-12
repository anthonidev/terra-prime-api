import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log del error
    this.logError(exception, request, errorResponse);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): ApiErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    // Manejo de HttpException de NestJS
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message: string | string[] = exception.message;
      if (
        typeof exceptionResponse === 'object' &&
        'message' in exceptionResponse
      ) {
        const responseMessage = (exceptionResponse as any).message;
        message =
          typeof responseMessage === 'string' || Array.isArray(responseMessage)
            ? responseMessage
            : exception.message;
      }

      return {
        statusCode: status,
        timestamp,
        path,
        method,
        message,
        error:
          typeof exceptionResponse === 'object' && 'error' in exceptionResponse
            ? (exceptionResponse.error as string)
            : exception.name,
      };
    }

    // Manejo de errores de TypeORM/Base de datos
    if (exception instanceof QueryFailedError) {
      return this.handleDatabaseError(exception, timestamp, path, method);
    }

    // Error genérico no controlado
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
      method,
      message: 'Error interno del servidor',
      error: 'Internal Server Error',
    };
  }

  private handleDatabaseError(
    error: QueryFailedError,
    timestamp: string,
    path: string,
    method: string,
  ): ApiErrorResponse {
    const driverError = error.driverError as any;

    // Errores de constraint/unique violation (PostgreSQL)
    if (driverError?.code === '23505') {
      return {
        statusCode: HttpStatus.CONFLICT,
        timestamp,
        path,
        method,
        message: 'El registro ya existe en la base de datos',
        error: 'Conflict',
      };
    }

    // Errores de foreign key violation
    if (driverError?.code === '23503') {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp,
        path,
        method,
        message: 'Referencia inválida a registro relacionado',
        error: 'Bad Request',
      };
    }

    // Otros errores de base de datos
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
      method,
      message: 'Error en la operación de base de datos',
      error: 'Database Error',
    };
  }

  private logError(
    exception: unknown,
    request: Request,
    errorResponse: ApiErrorResponse,
  ): void {
    const { statusCode, message } = errorResponse;
    const { method, url, body, params, query } = request;

    const logContext = {
      method,
      url,
      statusCode,
      message,
      body: Object.keys(body || {}).length > 0 ? body : undefined,
      params: Object.keys(params || {}).length > 0 ? params : undefined,
      query: Object.keys(query || {}).length > 0 ? query : undefined,
    };

    // Log según severidad
    if (statusCode >= 500) {
      this.logger.error(
        `${method} ${url} - ${statusCode}`,
        exception instanceof Error ? exception.stack : undefined,
        JSON.stringify(logContext, null, 2),
      );
    } else if (statusCode >= 400) {
      this.logger.warn(
        `${method} ${url} - ${statusCode}: ${message}`,
        JSON.stringify(logContext, null, 2),
      );
    }
  }
}
