import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CHATBOT_SERVICE } from 'src/config/services';
import { CreateContextBaseDto } from '../dto/create-base-context.dto';
import { CreateQuickHelpDto } from '../dto/create-quick-help.dto';
import { CreateRoleContextDto } from '../dto/create-role-context.dto';
import { CreateSystemGuideDto } from '../dto/create-system-guide.dto';
import { CreateDatabaseAccessDto } from '../dto/create-database-context.dto';

@Controller('chatbot/context')
export class ContextController {
  constructor(
    @Inject(CHATBOT_SERVICE) private readonly chatbotClient: ClientProxy,
  ) {}

  @Post('base-create')
  createContextBase(@Body() dto: CreateContextBaseDto) {
    return this.chatbotClient.send({ cmd: 'context.base.create' }, dto);
  }

  @Post('quick-help/create')
  createQuickHelp(@Body() dto: CreateQuickHelpDto) {
    return this.chatbotClient.send({ cmd: 'context.quick-help.create' }, dto);
  }

  @Post('system-guide/create')
  createSystemGuide(@Body() dto: CreateSystemGuideDto) {
    return this.chatbotClient.send({ cmd: 'context.system-guide.create' }, dto);
  }

  @Post('role-context/create')
  createRoleContext(@Body() dto: CreateRoleContextDto) {
    return this.chatbotClient.send({ cmd: 'context.role-context.create' }, dto);
  }

  @Post('access-database/create')
  createDatabaseAccess(@Body() dto: CreateDatabaseAccessDto) {
    return this.chatbotClient.send(
      { cmd: 'context.database-access.create' },
      dto,
    );
  }
}
