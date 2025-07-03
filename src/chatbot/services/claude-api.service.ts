import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { envs } from 'src/config/envs';

export interface ClaudeApiConfig {
  model: string;
  maxTokens: number;
  temperature?: number;
  timeout: number;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeApiResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

@Injectable()
export class ClaudeApiService {
  private readonly logger = new Logger(ClaudeApiService.name);

  private readonly defaultConfig: ClaudeApiConfig = {
    model: 'claude-3-haiku-20240307',
    maxTokens: 500,
    temperature: 0.7,
    timeout: 25000,
  };

  constructor(private readonly httpService: HttpService) {}

  async sendMessage(
    messages: ClaudeMessage[],
    config: Partial<ClaudeApiConfig> = {},
  ): Promise<string> {
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      if (!envs.claudeApiKey || envs.claudeApiKey.trim() === '') {
        throw new Error('Claude API key not configured');
      }

      const response = await firstValueFrom(
        this.httpService.post<ClaudeApiResponse>(
          'https://api.anthropic.com/v1/messages',
          {
            model: finalConfig.model,
            max_tokens: finalConfig.maxTokens,
            temperature: finalConfig.temperature,
            messages,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': envs.claudeApiKey,
              'anthropic-version': '2023-06-01',
            },
            timeout: finalConfig.timeout,
          },
        ),
      );

      if (!response?.data?.content?.[0]?.text) {
        throw new Error('Invalid response from Claude API');
      }

      this.logger.debug(
        `✅ Claude API response received (${response.data.content[0].text.length} chars)`,
      );

      return response.data.content[0].text;
    } catch (error) {
      this.logger.error(`❌ Claude API Error: ${error.message}`);

      if (error.response?.status) {
        this.logger.error(`🔥 API Status: ${error.response.status}`);
        if (error.response.data) {
          this.logger.error(
            `📄 API Response: ${JSON.stringify(error.response.data)}`,
          );
        }
      }

      throw error;
    }
  }

  async generateTitle(firstMessage: string): Promise<string> {
    try {
      const titlePrompt = `Genera un título corto (máximo 6 palabras) para una conversación que comienza con: "${firstMessage.slice(0, 100)}..."

Responde SOLO con el título, sin comillas ni explicaciones.`;

      const title = await this.sendMessage(
        [{ role: 'user', content: titlePrompt }],
        { maxTokens: 20 },
      );

      return title.trim().replace(/['"]/g, '').slice(0, 50);
    } catch (error) {
      this.logger.warn(`Error generating title: ${error.message}`);
      return this.generateFallbackTitle(firstMessage);
    }
  }

  private generateFallbackTitle(message: string): string {
    const keywords = [
      'usuario',
      'proyecto',
      'venta',
      'lead',
      'pago',
      'reporte',
    ];
    const found = keywords.find((keyword) =>
      message.toLowerCase().includes(keyword),
    );

    if (found) {
      return `Consulta sobre ${found}`;
    }

    const firstWords = message.split(' ').slice(0, 4).join(' ');
    return firstWords.length > 30
      ? firstWords.slice(0, 27) + '...'
      : firstWords;
  }

  isAvailable(): boolean {
    return !!(envs.claudeApiKey && envs.claudeApiKey.trim());
  }
}
