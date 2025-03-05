import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { envs } from './config/envs';
import { UsersModule } from './user/user.module';
import { SeedModule } from './seed/seed.module';
import { ProjectModule } from './project/project.module';
import * as crypto from 'crypto';
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
        // synchronize: envs.environment !== 'production',
        synchronize: true,
      }),
    }),
    AuthModule,
    UsersModule,
    SeedModule,
    ProjectModule,
  ],
})
export class AppModule {}
