import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionResponse, isObject } from '@common/interfaces/jsend-response.interface';
import { ResponseUtil } from '@common/utils/response.util';
import { Response } from 'express';

/**
 * Global exception filter that formats all exceptions to JSend format
 */
@Catch()
export class JSendExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let jsendResponse;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Handle validation errors (BadRequestException with validation errors)
      if (
        status === HttpStatus.BAD_REQUEST &&
        isObject(exceptionResponse) &&
        'message' in exceptionResponse
      ) {
        const exceptionData = exceptionResponse as unknown as HttpExceptionResponse;

        // Check if it's a validation error (array of messages)
        if (Array.isArray(exceptionData.message)) {
          // Convert validation errors to JSend fail format
          const errors: { [key: string]: string[] } = {};

          exceptionData.message.forEach((msg: string) => {
            // Try to extract field name from message (e.g., "email must be an email")
            const parts = msg.split(' ');
            const field = parts[0] || 'validation';

            if (!errors[field]) {
              errors[field] = [];
            }
            errors[field].push(msg);
          });

          jsendResponse = ResponseUtil.fail(errors);
        } else if (typeof exceptionData.message === 'string') {
          // Single error message
          jsendResponse = ResponseUtil.fail({
            message: exceptionData.message,
          });
        } else {
          // Unknown format, use as is
          jsendResponse = ResponseUtil.fail({
            message: 'Validation failed',
          });
        }
      } else if (status >= HttpStatus.BAD_REQUEST && status < HttpStatus.INTERNAL_SERVER_ERROR) {
        // Client errors (4xx) -> JSend fail
        const message = this.extractMessage(exceptionResponse, 'Bad request');

        jsendResponse = ResponseUtil.fail({ message });
      } else {
        // Server errors (5xx) -> JSend error
        const message = this.extractMessage(exceptionResponse, 'Internal server error');

        jsendResponse = ResponseUtil.error(message, status);
      }
    } else {
      // Unknown exception -> JSend error
      const message = exception instanceof Error ? exception.message : 'Internal server error';

      jsendResponse = ResponseUtil.error(message, status);
    }

    response.status(status).json(jsendResponse);
  }

  /**
   * Extract message from exception response
   */
  private extractMessage(exceptionResponse: string | object, defaultMessage: string): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (isObject(exceptionResponse) && 'message' in exceptionResponse) {
      const msg = exceptionResponse.message;
      if (typeof msg === 'string') {
        return msg;
      }
    }

    return defaultMessage;
  }
}
