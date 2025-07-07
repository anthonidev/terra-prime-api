import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CHATBOT_SERVICE } from 'src/config/services';

@Injectable()
export class ChatbotRateLimitGuard implements CanActivate {
  constructor(
    @Inject(CHATBOT_SERVICE)
    private readonly chatbotClient: ClientProxy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    const rateLimitResult = await firstValueFrom(
      this.chatbotClient.send(
        { cmd: 'chatbot.rate-limit.can-request' },
        { user: user },
      ),
    );
    console.log('Rate limit result:', rateLimitResult);

    if (!rateLimitResult) {
      throw new HttpException(
        {
          success: false,
          message: 'Límite de mensajes excedido',
          error: 'RATE_LIMIT_EXCEEDED',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
