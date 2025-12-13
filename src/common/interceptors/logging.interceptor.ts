import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

/**
 * Error object with status and message
 */
interface ErrorWithStatus {
  status?: number;
  message?: string;
  stack?: string;
}

/**
 * Interceptor that logs all HTTP requests and responses
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl, ip } = request;
    const body = request.body as Record<string, unknown>;
    const query = request.query as Record<string, unknown>;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    // Log incoming request
    this.logger.log(`📥 REQUEST ${method} ${originalUrl} - IP: ${ip} - UA: ${userAgent}`);

    if (Object.keys(query).length > 0) {
      this.logger.debug(`Query Params: ${JSON.stringify(query)}`);
    }

    if (body && Object.keys(body).length > 0) {
      // Remove sensitive fields before logging
      const sanitizedBody = this.sanitizeBody(body);
      this.logger.debug(`Body: ${JSON.stringify(sanitizedBody)}`);
    }

    return next.handle().pipe(
      tap({
        next: (data: unknown) => {
          const elapsedTime = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.logger.log(
            `📤 RESPONSE ${method} ${originalUrl} - Status: ${statusCode} - ${elapsedTime}ms`,
          );

          // Log response body (only in debug mode to avoid too much logging)
          if (data) {
            this.logger.debug(`Response: ${JSON.stringify(data)}`);
          }
        },
        error: (error: ErrorWithStatus) => {
          const elapsedTime = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.logger.error(
            `❌ ERROR ${method} ${originalUrl} - Status: ${statusCode} - ${elapsedTime}ms`,
          );

          if (error.message) {
            this.logger.error(`Error: ${error.message}`);
          }

          if (error.stack) {
            this.logger.debug(`Stack: ${error.stack}`);
          }
        },
      }),
    );
  }

  /**
   * Remove sensitive information from request body before logging
   */
  private sanitizeBody(body: unknown): unknown {
    const sensitiveFields = [
      'password',
      'passwordConfirm',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'secret',
      'authorization',
    ];

    if (typeof body !== 'object' || body === null) {
      return body;
    }

    const sanitized = { ...body } as Record<string, unknown>;

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
