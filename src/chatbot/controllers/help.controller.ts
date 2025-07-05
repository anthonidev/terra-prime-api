import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { JwtUser } from 'src/auth/interface/jwt-payload.interface';
import { CHATBOT_SERVICE } from 'src/config/services';

@Controller('chatbot/help')
@UseGuards(JwtAuthGuard)
export class HelpController {
  constructor(
    @Inject(CHATBOT_SERVICE) private readonly chatbotClient: ClientProxy,
  ) {}

  @Get('quick-help')
  getQuickHelp(@GetUser() user: JwtUser) {
    return this.chatbotClient.send(
      { cmd: 'context.quick-help.get-by-role' },
      user.role,
    );
  }

  @Get('guide/:guideKey')
  getStepByStepGuide(
    @GetUser() user: JwtUser,
    @Param('guideKey') guideKey: string,
  ) {
    return this.chatbotClient.send(
      { cmd: 'context.guide.by-key' },
      { role: user.role, guideKey },
    );
  }

  @Get('available-guides')
  getAvailableGuides(@GetUser() user: JwtUser) {
    return this.chatbotClient.send(
      { cmd: 'context.available-guides.get-by-role' },
      user.role,
    );
  }
}
