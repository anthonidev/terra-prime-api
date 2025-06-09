import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';
import { View } from 'src/user/entities/view.entity';
import { Role } from 'src/user/entities/role.entity';
import { UsersModule } from 'src/user/user.module';
import { LeadModule } from 'src/lead/lead.module';
import { PaymentConfig } from 'src/admin-payments/payments-config/entities/payments-config.entity';
import { CutConfiguration } from 'src/cuts/entities/cut_configurations.entity';
@Module({
  imports: [TypeOrmModule.forFeature([View, Role, PaymentConfig, CutConfiguration]), UsersModule, LeadModule],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
