import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LeadsModule } from './commercial/leads/leads.module';
import { SalesModule } from './commercial/sales/sales.module';
import { envs } from './config/envs';
import { CollectionsModule } from './finance/collections/collections.module';
import { TreasuryModule } from './finance/treasury/treasury.module';
import { ApprovalsModule } from './iam/approvals/approvals.module';
import { AuthModule } from './iam/auth/auth.module';
import { UsersModule } from './iam/users/users.module';
import { BloksModule } from './inventory/bloks/bloks.module';
import { LotsModule } from './inventory/lots/lots.module';
import { ProjectsModule } from './inventory/projects/projects.module';
import { StagesModule } from './inventory/stages/stages.module';
import { EmailModule } from './shared/email/email.module';
import { StorageModule } from './shared/storage/storage.module';

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
    AuthModule,
    UsersModule,
    LeadsModule,
    SalesModule,
    CollectionsModule,
    TreasuryModule,
    ProjectsModule,
    EmailModule,
    StorageModule,
    LotsModule,
    BloksModule,
    StagesModule,
    ApprovalsModule,
  ],
})
export class AppModule {}
