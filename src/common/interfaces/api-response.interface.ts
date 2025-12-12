/**
 * Interface para respuestas exitosas estandarizadas de la API
 */
export interface ApiResponse<T = any> {
  /**
   * Datos de la respuesta
   */
  data: T;

  /**
   * Mensaje descriptivo de la operación (opcional)
   */
  message?: string;

  /**
   * Timestamp de la respuesta
   */
  timestamp: string;

  /**
   * Path de la petición
   */
  path: string;
}

/**
 * Interface para respuestas de error estandarizadas
 */
export interface ApiErrorResponse {
  /**
   * Código de estado HTTP
   */
  statusCode: number;

  /**
   * Mensaje de error
   */
  message: string | string[];

  /**
   * Tipo de error
   */
  error?: string;

  /**
   * Timestamp del error
   */
  timestamp: string;

  /**
   * Path de la petición
   */
  path: string;

  /**
   * Método HTTP de la petición
   */
  method: string;
}
