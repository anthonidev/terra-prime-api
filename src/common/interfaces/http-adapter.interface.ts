export abstract class HttpAdapter {
  abstract get<T>(url: string, apiKey?: string): Promise<T>;
  abstract post<T>(url: string, body: any, apiKey?: string): Promise<T>;
}
