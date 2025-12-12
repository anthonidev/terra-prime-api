import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

/**
 * Interceptor para estandarizar todas las respuestas exitosas de la API
 */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const path = request.url;

    return next.handle().pipe(
      map((data) => {
        // Si data ya tiene la estructura esperada, solo agregar campos faltantes
        if (data && typeof data === 'object' && 'data' in data) {
          return {
            data: data.data,
            message: data.message,
            timestamp: new Date().toISOString(),
            path,
          };
        }

        // Estructura estándar para respuestas simples
        return {
          data,
          timestamp: new Date().toISOString(),
          path,
        };
      }),
    );
  }
}
