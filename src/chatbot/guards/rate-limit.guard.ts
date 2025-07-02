import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RateLimitService } from '../services/rate-limit.service';

@Injectable()
export class ChatbotRateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    const rateLimitResult = await this.rateLimitService.checkRateLimit(user);

    if (!rateLimitResult.allowed) {
      throw new HttpException(
        {
          success: false,
          message: 'Límite de mensajes excedido',
          error: 'RATE_LIMIT_EXCEEDED',
          details: {
            blockReason: rateLimitResult.blockReason,
            resetTime: rateLimitResult.resetTime,
            remaining: rateLimitResult.remaining,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Añadir información de rate limit a la respuesta
    request.rateLimitInfo = {
      remaining: rateLimitResult.remaining,
      resetTime: rateLimitResult.resetTime,
      isWarning: rateLimitResult.isWarning,
    };

    return true;
  }
}
