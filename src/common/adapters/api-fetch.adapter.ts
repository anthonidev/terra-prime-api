import { Injectable } from '@nestjs/common';
import { HttpAdapter } from '../interfaces/http-adapter.interface';
import { RpcException } from '@nestjs/microservices';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ApiFetchAdapter implements HttpAdapter {
  constructor() {}

  async get<T>(url: string, apiKey?: string): Promise<T> {
    const headers = this.getHeaders(url, apiKey);
    const res = await fetch(url, {
      method: 'GET',
      headers,
    });
    return this.handleResponse<T>(res);
  }

  async post<T>(url: string, body: any, apiKey?: string): Promise<T> {
    const isFormData = body instanceof FormData;
    const headers = this.getHeaders(url, apiKey, isFormData);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: isFormData ? body : JSON.stringify(body),
    });

    return this.handleResponse<T>(res);
  }

  private getHeaders(
    url: string,
    apiKey?: string,
    isFormData = false,
  ): HeadersInit {
    const headers: HeadersInit = {};
    if (!isFormData) headers['Content-Type'] = 'application/json';
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    return headers;
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    const data = (await res.json()) as ApiResponse<T>;
    if (!res.ok)
      throw new RpcException({
        message: data.message || 'Error en la API externa',
        status: res.status,
        // error: data.error || 'ExternalApiError',
      });
    if (data && typeof data === 'object' && 'success' in data) {
      if (!data.success)
        throw new RpcException({
          message: data.message || 'Error en la API externa',
          status: res.status,
          // error: data.error || 'ExternalApiError',
        });
      return data.data as T;
    }
    return data as T;
  }
}
