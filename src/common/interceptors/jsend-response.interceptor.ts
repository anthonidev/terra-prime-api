import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import {
  isObject,
  JSendResponse,
  JSendSuccessResponse,
  PaginationMeta,
} from '@common/interfaces/jsend-response.interface';
import { map, Observable } from 'rxjs';

/**
 * Response with pagination metadata
 */
interface PaginatedResponse<T = unknown> {
  data: T;
  meta: PaginationMeta;
}

/**
 * Interceptor that automatically wraps all successful responses in JSend format
 */
@Injectable()
export class JSendResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<JSendResponse> {
    return next.handle().pipe(
      map((data: unknown) => {
        // If response is already in JSend format, return as is
        if (this.isJSendResponse(data)) {
          return data;
        }

        // If response has pagination metadata, include it
        if (this.hasPaginationMeta(data)) {
          return {
            status: 'success',
            data: data.data,
            meta: data.meta,
          } as JSendSuccessResponse;
        }

        // Wrap regular response in JSend success format
        return {
          status: 'success',
          data,
        } as JSendSuccessResponse;
      }),
    );
  }

  /**
   * Check if response is already in JSend format
   */
  private isJSendResponse(data: unknown): data is JSendResponse {
    if (!isObject(data) || !('status' in data)) {
      return false;
    }

    const status = data.status;
    return status === 'success' || status === 'fail' || status === 'error';
  }

  /**
   * Check if response has pagination metadata
   */
  private hasPaginationMeta(data: unknown): data is PaginatedResponse {
    if (!isObject(data) || !('data' in data) || !('meta' in data)) {
      return false;
    }

    const meta = data.meta;
    if (!isObject(meta)) {
      return false;
    }

    return (
      'page' in meta &&
      'perPage' in meta &&
      'totalItems' in meta &&
      'totalPages' in meta &&
      typeof meta.page === 'number' &&
      typeof meta.perPage === 'number' &&
      typeof meta.totalItems === 'number' &&
      typeof meta.totalPages === 'number'
    );
  }
}
