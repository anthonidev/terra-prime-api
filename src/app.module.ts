import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminCollectionsModule } from './admin-collections/admin-collections.module';
import { AdminPaymentsModule } from './admin-payments/admin-payments.module';
import { AdminSalesModule } from './admin-sales/admin-sales.module';
import { AuthModule } from './auth/auth.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { envs } from './config/envs';
import { CutsModule } from './cuts/cuts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EmailModule } from './email/email.module';
import { FilesModule } from './files/files.module';
import { LeadModule } from './lead/lead.module';
import { ProjectModule } from './project/project.module';
import { ReportsModule } from './reports/reports.module';
import { SystemsModule } from './systems/systems.module';
import { UsersModule } from './user/user.module';
import { ExternalApiModule } from './external-api/external-api.module';
import { MigrationsModule } from './migrations/migrations.module';
import { json, urlencoded } from 'express';

@Module({
  imports: [
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
    ExternalApiModule,
    MigrationsModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        json({ limit: '50mb' }),
        urlencoded({ extended: true, limit: '50mb' }),
      )
      .forRoutes('*'); // Aplica a todas las rutas
  }
}
