import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CHATBOT_SERVICE } from 'src/config/services';
import { CreateContextBaseDto } from '../dto/create-base-context.dto';
import { CreateQuickHelpDto } from '../dto/create-quick-help.dto';
import { CreateRoleContextDto } from '../dto/create-role-context.dto';
import { CreateSystemGuideDto } from '../dto/create-system-guide.dto';

@Controller('chatbot/context')
export class ContextController {
  constructor(
    @Inject(CHATBOT_SERVICE)
    private readonly chatbotClient: ClientProxy,
  ) {}

  @Post('base-create')
  createContextBase(@Body() registerDto: CreateContextBaseDto) {
    return this.chatbotClient.send({ cmd: 'context.base.create' }, registerDto);
  }

  @Post('quick-help/create')
  createQuickHelp(@Body() registerDto: CreateQuickHelpDto) {
    return this.chatbotClient.send(
      { cmd: 'context.quick-help.create' },
      registerDto,
    );
  }
  @Post('system-guide/create')
  createSystemGuide(@Body() registerDto: CreateSystemGuideDto) {
    return this.chatbotClient.send(
      { cmd: 'context.system-guide.create' },
      registerDto,
    );
  }

  @Post('role-context/create')
  createRoleContext(@Body() registerDto: CreateRoleContextDto) {
    return this.chatbotClient.send(
      { cmd: 'context.role-context.create' },
      registerDto,
    );
  }
}
