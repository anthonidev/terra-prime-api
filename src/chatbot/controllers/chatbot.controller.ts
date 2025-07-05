import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { JwtUser } from 'src/auth/interface/jwt-payload.interface';
import { CHATBOT_SERVICE } from 'src/config/services';
import { SendMessageDto } from '../dto/message.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('chatbot')
@UseGuards(JwtAuthGuard)
export class ChatbotController {
  constructor(
    @Inject(CHATBOT_SERVICE)
    private readonly chatbotClient: ClientProxy,
  ) {}

  @Post('message')
  // @UseGuards(ChatbotRateLimitGuard)
  async sendMessage(
    @GetUser() user: JwtUser,
    @Body() dto: SendMessageDto,
    // @Req() request: any,
  ) {
    return this.chatbotClient.send(
      { cmd: 'chatbot.send.message' },
      { user: user, data: dto },
    );
  }
}
