import {
  JSendErrorResponse,
  JSendFailResponse,
  JSendSuccessResponse,
  PaginationMeta,
} from '@common/interfaces/jsend-response.interface';

/**
 * Response builder utility for JSend format
 */
export class ResponseUtil {
  /**
   * Build a success response
   * @param data - The response data
   * @param meta - Optional pagination metadata
   */
  static success<T>(data: T, meta?: PaginationMeta): JSendSuccessResponse<T> {
    const response: JSendSuccessResponse<T> = {
      status: 'success',
      data,
    };

    if (meta) {
      response.meta = meta;
    }

    return response;
  }

  /**
   * Build a success response with pagination
   * @param data - The response data array
   * @param page - Current page number
   * @param perPage - Items per page
   * @param totalItems - Total number of items
   */
  static successWithPagination<T>(
    data: T[],
    page: number,
    perPage: number,
    totalItems: number,
  ): JSendSuccessResponse<T[]> {
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      status: 'success',
      data,
      meta: {
        page,
        perPage,
        totalItems,
        totalPages,
      },
    };
  }

  /**
   * Build a fail response (client error - validation, bad request)
   * @param errors - Object with field names as keys and error messages as values
   *
   * @example
   * ResponseUtil.fail({ email: 'Invalid email format', password: 'Password too short' })
   * ResponseUtil.fail({ email: ['Invalid email format', 'Email already exists'] })
   */
  static fail(errors: { [field: string]: string | string[] }): JSendFailResponse {
    return {
      status: 'fail',
      data: errors,
    };
  }

  /**
   * Build an error response (server error)
   * @param message - Error message
   * @param code - Optional error code
   * @param data - Optional additional error data
   */
  static error(message: string, code?: number, data?: Record<string, unknown>): JSendErrorResponse {
    const response: JSendErrorResponse = {
      status: 'error',
      message,
    };

    if (code !== undefined) {
      response.code = code;
    }

    if (data !== undefined) {
      response.data = data;
    }

    return response;
  }
}
