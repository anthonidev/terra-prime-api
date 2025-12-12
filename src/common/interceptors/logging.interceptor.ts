import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { envs } from 'src/config/envs';

/**
 * Interceptor para logging de todas las peticiones HTTP
 * Comportamiento adaptativo según el ambiente (development/production)
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly isProduction = envs.nodeEnv === 'production';
  private readonly logLevel = envs.logLevel;

  // Campos sensibles que deben ser sanitizados en los logs
  private readonly SENSITIVE_FIELDS = [
    'password',
    'token',
    'authorization',
    'secret',
    'apiKey',
    'api_key',
    'refreshToken',
    'accessToken',
  ];

  // Rutas que se excluyen del logging
  private readonly EXCLUDED_PATHS = ['/health', '/metrics', '/api/docs'];

  // Límite de tamaño de body/response en logs (en producción)
  private readonly MAX_LOG_SIZE = 500;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, body, query, params } = request;

    // Excluir rutas específicas del logging
    if (this.EXCLUDED_PATHS.some((path) => url.includes(path))) {
      return next.handle();
    }

    const startTime = Date.now();
    const user = request.user; // Usuario autenticado (si existe)

    // Log de la petición entrante
    this.logRequest(method, url, body, query, params, user);

    return next.handle().pipe(
      tap((data) => {
        const executionTime = Date.now() - startTime;
        this.logResponse(method, url, response.statusCode, executionTime, data);
      }),
      catchError((error) => {
        const executionTime = Date.now() - startTime;
        this.logError(method, url, executionTime, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Log de petición entrante
   */
  private logRequest(
    method: string,
    url: string,
    body: any,
    query: any,
    params: any,
    user?: any,
  ): void {
    // Log básico siempre
    const userInfo = user ? ` | User: ${user.email}` : '';
    this.logger.log(`➡️  ${method} ${url}${userInfo}`);

    // En producción, solo logs mínimos
    if (this.isProduction) {
      // Solo loggear si hay parámetros importantes
      if (Object.keys(params || {}).length > 0) {
        this.logger.log(`Params: ${JSON.stringify(params)}`);
      }
      return;
    }

    // En desarrollo, mostrar detalles completos
    const sanitizedBody = this.sanitizeData(body);
    const sanitizedQuery = this.sanitizeData(query);

    if (Object.keys(sanitizedBody || {}).length > 0) {
      this.logger.debug(`Body: ${this.truncateLog(sanitizedBody)}`);
    }

    if (Object.keys(sanitizedQuery || {}).length > 0) {
      this.logger.debug(`Query: ${JSON.stringify(sanitizedQuery)}`);
    }

    if (Object.keys(params || {}).length > 0) {
      this.logger.debug(`Params: ${JSON.stringify(params)}`);
    }
  }

  /**
   * Log de respuesta exitosa
   */
  private logResponse(
    method: string,
    url: string,
    statusCode: number,
    executionTime: number,
    data: any,
  ): void {
    // Log básico siempre con tiempo de ejecución
    this.logger.log(
      `⬅️  ${method} ${url} | Status: ${statusCode} | Time: ${executionTime}ms`,
    );

    // Alerta si la petición es lenta (más de 1 segundo)
    if (executionTime > 1000) {
      this.logger.warn(
        `⚠️  Slow request detected: ${method} ${url} took ${executionTime}ms`,
      );
    }

    // En producción, NO mostrar datos de respuesta
    if (this.isProduction) {
      return;
    }

    // En desarrollo, mostrar respuesta sanitizada y truncada
    if (this.logLevel === 'debug') {
      const sanitizedData = this.sanitizeData(data);
      this.logger.debug(`Response: ${this.truncateLog(sanitizedData)}`);
    }
  }

  /**
   * Log de error
   */
  private logError(
    method: string,
    url: string,
    executionTime: number,
    error: any,
  ): void {
    const statusCode = error.status || 500;
    const errorMessage = error.message || 'Internal Server Error';

    // Siempre loggear errores
    this.logger.error(
      `❌ ${method} ${url} | Status: ${statusCode} | Time: ${executionTime}ms | Error: ${errorMessage}`,
    );

    // Stack trace solo en desarrollo o errores 5xx en producción
    if (!this.isProduction || statusCode >= 500) {
      if (error.stack) {
        this.logger.error(`Stack: ${error.stack}`);
      }
    }
  }

  /**
   * Trunca el log si es demasiado grande (para producción)
   */
  private truncateLog(data: any): string {
    const jsonString = JSON.stringify(data, null, 2);

    if (!this.isProduction || jsonString.length <= this.MAX_LOG_SIZE) {
      return jsonString;
    }

    return jsonString.substring(0, this.MAX_LOG_SIZE) + '... [TRUNCATED]';
  }

  /**
   * Sanitiza datos sensibles reemplazándolos con [REDACTED]
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    const sanitized = { ...data };

    for (const key of Object.keys(sanitized)) {
      // Verificar si el campo es sensible
      if (
        this.SENSITIVE_FIELDS.some((field) =>
          key.toLowerCase().includes(field.toLowerCase()),
        )
      ) {
        sanitized[key] = '[REDACTED]';
      } else if (
        typeof sanitized[key] === 'object' &&
        sanitized[key] !== null
      ) {
        // Recursivamente sanitizar objetos anidados
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }
}
