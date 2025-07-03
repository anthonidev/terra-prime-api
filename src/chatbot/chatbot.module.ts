import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadModule } from 'src/lead/lead.module';
import { ProjectModule } from 'src/project/project.module';
import { UsersModule } from 'src/user/user.module';

import { HelpController } from './controllers/help.controller';

import { ChatMessage } from './entities/chat-message.entity';
import { ChatRateLimit } from './entities/chat-rate-limit.entity';
import { ChatSession } from './entities/chat-session.entity';

import { ChatController } from './controllers/chatbot.controller';
import { ChatbotService } from './services/chatbot.service';
import { ContextService } from './services/context.service';
import { RateLimitService } from './services/rate-limit.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([ChatMessage, ChatRateLimit, ChatSession]),
    UsersModule,
    LeadModule,
    ProjectModule,
  ],
  controllers: [ChatController, HelpController],
  providers: [ChatbotService, ContextService, RateLimitService],
  exports: [ChatbotService, ContextService, RateLimitService, TypeOrmModule],
})
export class ChatbotModule {}
