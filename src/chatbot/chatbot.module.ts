import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadModule } from 'src/lead/lead.module';
import { ProjectModule } from 'src/project/project.module';
import { UsersModule } from 'src/user/user.module';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatRateLimit } from './entities/chat-rate-limit.entity';
import { ChatSession } from './entities/chat-session.entity';
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
  controllers: [ChatbotController],
  providers: [ChatbotService, ContextService, RateLimitService],
  exports: [ChatbotService, ContextService, RateLimitService, TypeOrmModule],
})
export class ChatbotModule {}
