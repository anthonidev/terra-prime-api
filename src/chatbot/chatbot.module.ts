import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadModule } from 'src/lead/lead.module';
import { ProjectModule } from 'src/project/project.module';
import { UsersModule } from 'src/user/user.module';

// Controladores separados por responsabilidad
import { AdminController } from './controllers/admin.controller';
import { HelpController } from './controllers/help.controller';

// Entidades
import { ChatMessage } from './entities/chat-message.entity';
import { ChatRateLimit } from './entities/chat-rate-limit.entity';
import { ChatSession } from './entities/chat-session.entity';

// Servicios
import { ChatbotService } from './services/chatbot.service';
import { ContextService } from './services/context.service';
import { RateLimitService } from './services/rate-limit.service';
import { ChatController } from './controllers/chatbot.controller';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([ChatMessage, ChatRateLimit, ChatSession]),
    UsersModule,
    LeadModule,
    ProjectModule,
  ],
  controllers: [
    ChatController, // Manejo básico de chat y mensajes
    HelpController, // Sistema de ayuda y contexto
    AdminController, // Funciones administrativas y estadísticas
  ],
  providers: [
    ChatbotService, // Servicio principal (ahora en carpeta services)
    ContextService, // Manejo de contexto
    RateLimitService, // Rate limiting
  ],
  exports: [ChatbotService, ContextService, RateLimitService, TypeOrmModule],
})
export class ChatbotModule {}
