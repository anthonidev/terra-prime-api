import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadModule } from 'src/lead/lead.module';
import { ProjectModule } from 'src/project/project.module';
import { UsersModule } from 'src/user/user.module';

import { ChatController } from './controllers/chatbot.controller';
import { HelpController } from './controllers/help.controller';

import { ChatMessage } from './entities/chat-message.entity';
import { ChatRateLimit } from './entities/chat-rate-limit.entity';
import { ChatSession } from './entities/chat-session.entity';

// Servicios principales
import { ChatbotService } from './services/chatbot.service';
import { ClaudeApiService } from './services/claude-api.service';
import { ContextService } from './services/context.service';
import { RateLimitService } from './services/rate-limit.service';
import { SessionTitleService } from './services/title.service';

// Factory y agentes
import { SysRoleAgent } from './agents/sys-role.agent';
import { VenRoleAgent } from './agents/ven-role.agent';
import { RoleAgentFactory } from './factories/role-agent.factory';

// Importar otros agentes cuando se implementen:
// import { AdmRoleAgent } from './agents/adm-role.agent';
// import { JveRoleAgent } from './agents/jve-role.agent';
// import { RecRoleAgent } from './agents/rec-role.agent';
// import { CobRoleAgent } from './agents/cob-role.agent';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([ChatMessage, ChatRateLimit, ChatSession]),
    UsersModule,
    LeadModule,
    ProjectModule,
  ],
  controllers: [ChatController, HelpController],
  providers: [
    // Servicios principales - el orden es importante
    ContextService, // Debe ir primero porque otros servicios dependen de él
    ClaudeApiService,
    RateLimitService,
    SessionTitleService,

    // Agentes por rol - necesitan ContextService y ClaudeApiService
    SysRoleAgent,
    VenRoleAgent,
    // Agregar otros agentes cuando se implementen:
    // AdmRoleAgent,
    // JveRoleAgent,
    // RecRoleAgent,
    // CobRoleAgent,

    // Factory - necesita todos los agentes
    RoleAgentFactory,

    // Servicio principal - necesita todos los anteriores
    ChatbotService,
  ],
  exports: [
    ChatbotService,
    ContextService,
    RateLimitService,
    ClaudeApiService,
    SessionTitleService,
    RoleAgentFactory,
    TypeOrmModule,
  ],
})
export class ChatbotModule {}
