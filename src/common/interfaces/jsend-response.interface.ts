/**
 * JSend Response Interfaces
 * Based on JSend specification: https://github.com/omniti-labs/jsend
 */

export type JSendStatus = 'success' | 'fail' | 'error';

/**
 * Metadata for paginated responses
 */
export interface PaginationMeta {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Base JSend response interface
 */
export interface BaseJSendResponse {
  status: JSendStatus;
}

/**
 * Success response
 * Used when the request was successful
 */
export interface JSendSuccessResponse<T = unknown> extends BaseJSendResponse {
  status: 'success';
  data: T;
  meta?: PaginationMeta;
}

/**
 * Fail response
 * Used when the request failed due to client error (validation, invalid data, etc.)
 */
export interface JSendFailResponse extends BaseJSendResponse {
  status: 'fail';
  data: {
    [field: string]: string | string[];
  };
}

/**
 * Error response
 * Used when the request failed due to server error
 */
export interface JSendErrorResponse extends BaseJSendResponse {
  status: 'error';
  message: string;
  code?: number;
  data?: Record<string, unknown>;
}

/**
 * Union type for all JSend responses
 */
export type JSendResponse<T = unknown> =
  | JSendSuccessResponse<T>
  | JSendFailResponse
  | JSendErrorResponse;

/**
 * Type guard to check if value is an object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * NestJS HttpException response shape
 */
export interface HttpExceptionResponse {
  message: string | string[];
  error?: string;
  statusCode?: number;
}
