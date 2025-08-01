import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs } from 'src/config/envs';
import { CHATBOT_SERVICE } from 'src/config/services';
import { ChatbotController } from './controllers/chatbot.controller';
import { ContextController } from './controllers/context.controller';
import { HelpController } from './controllers/help.controller';
import { UsersModule } from 'src/user/user.module';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: CHATBOT_SERVICE,
        transport: Transport.NATS,
        options: {
          servers: [envs.natsServers],
        },
      },
    ]),
    UsersModule,
  ],
  controllers: [ChatbotController, ContextController, HelpController],
  exports: [ClientsModule],
})
export class ChatbotModule {}
