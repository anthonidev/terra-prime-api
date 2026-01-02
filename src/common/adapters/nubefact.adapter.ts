import { Injectable } from '@nestjs/common';
import { HttpAdapter } from '../interfaces/http-adapter.interface';
import { RpcException } from '@nestjs/microservices';
import { envs } from 'src/config/envs';

@Injectable()
export class NubefactAdapter implements HttpAdapter {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor() {
    this.baseUrl = envs.nubefactBaseUrl || '';
    this.token = envs.nubefactToken || '';
  }

  async get<T>(url: string, apiKey?: string): Promise<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    const headers = this.getHeaders(apiKey);

    const res = await fetch(fullUrl, {
      method: 'GET',
      headers,
    });

    return this.handleResponse<T>(res);
  }

  async post<T>(url: string, body: any, apiKey?: string): Promise<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    const headers = this.getHeaders(apiKey);

    const res = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    return this.handleResponse<T>(res);
  }

  private getHeaders(apiKey?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey || this.token}`,
    };
    return headers;
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    const contentType = res.headers.get('content-type');

    // Verificar si la respuesta es JSON
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      console.error('Nubefact API Error - Response is not JSON:', {
        status: res.status,
        statusText: res.statusText,
        contentType,
        url: res.url,
        bodyPreview: text.substring(0, 200)
      });

      throw new RpcException({
        message: `Error de Nubefact: La API respondió con ${contentType || 'HTML'} en lugar de JSON. Verifica la URL base y el token. Status: ${res.status}`,
        status: res.status,
      });
    }

    let data;
    try {
      data = await res.json();
    } catch (error) {
      throw new RpcException({
        message: 'Error al parsear la respuesta de Nubefact como JSON',
        status: res.status,
      });
    }

    if (!res.ok) {
      throw new RpcException({
        message: data.errors || 'Error en la API de Nubefact',
        status: res.status,
      });
    }

    // Nubefact puede devolver errores con status 200
    if (data.errors) {
      throw new RpcException({
        message: data.errors,
        status: 400,
      });
    }

    return data as T;
  }
}
