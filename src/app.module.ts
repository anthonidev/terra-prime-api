import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { envs } from './config/envs';
import { UsersModule } from './user/user.module';
import { SeedModule } from './seed/seed.module';
import { ProjectModule } from './project/project.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LeadModule } from './lead/lead.module';
import { AdminSalesModule } from './admin-sales/admin-sales.module';
import { AdminPaymentsModule } from './admin-payments/admin-payments.module';
import { EmailModule } from './email/email.module';
import { FilesModule } from './files/files.module';
import { SystemsModule } from './systems/systems.module';
import { AdminCollectionsModule } from './admin-collections/admin-collections.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CutsModule } from './cuts/cuts.module';
import { ReportsModule } from './reports/reports.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CHATBOT_SERVICE } from './config/services';
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
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: envs.dbHost,
        port: envs.dbPort,
        database: envs.dbName,
        username: envs.dbUsername,
        password: envs.dbPassword,
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    SeedModule,
    ProjectModule,
    DashboardModule,
    LeadModule,
    AdminSalesModule,
    AdminPaymentsModule,
    EmailModule,
    FilesModule,
    SystemsModule,
    AdminCollectionsModule,
    CutsModule,
    ReportsModule,
    ChatbotModule,
  ],
})
export class AppModule {}
