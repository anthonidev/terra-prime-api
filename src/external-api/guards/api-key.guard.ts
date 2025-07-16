import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { envs } from 'src/config/envs';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedKey = this.extractApiKey(request);
    const validKey = envs.apiKeyExternal;

    if (!providedKey) {
      this.logger.warn(`Intento de acceso sin API Key desde IP: ${request.ip}`);
      throw new UnauthorizedException('API Key requerida');
    }

    if (providedKey !== validKey) {
      this.logger.warn(`API Key inválida desde IP: ${request.ip}`);
      throw new UnauthorizedException('API Key inválida');
    }
    // Agregar metadata útil al request
    request.apiAuth = {
      type: 'external_api',
      authenticated: true,
      ip: request.ip,
      timestamp: new Date(),
    };
    this.logger.log(`Acceso válido con API Key desde IP: ${request.ip}`);
    return true;
  }

  private extractApiKey(request: any): string | undefined {
    // Priorizar X-API-Key header
    const headerKey = request.headers['x-api-key'];
    // Fallback a Authorization Bearer
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer '))
      return authHeader.substring(7);
    return headerKey;
  }
}