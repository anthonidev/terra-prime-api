import { Controller, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CHATBOT_SERVICE } from 'src/config/services';

@Controller('chatbot')
export class ChatbotController {
  constructor(
    @Inject(CHATBOT_SERVICE)
    private readonly integrationClient: ClientProxy,
  ) {}
}
