import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MigrationsController } from './migrations.controller';
import { MigrationsService } from './migrations.service';

// Entities
import { Project } from 'src/project/entities/project.entity';
import { Stage } from 'src/project/entities/stage.entity';
import { Block } from 'src/project/entities/block.entity';
import { Lot } from 'src/project/entities/lot.entity';
import { Lead } from 'src/lead/entities/lead.entity';
import { Client } from 'src/admin-sales/clients/entities/client.entity';
import { SecondaryClient } from 'src/admin-sales/secondary-client/entities/secondary-client.entity';
import { Sale } from 'src/admin-sales/sales/entities/sale.entity';
import { Financing } from 'src/admin-sales/financing/entities/financing.entity';
import { FinancingInstallments } from 'src/admin-sales/financing/entities/financing-installments.entity';
import { Payment } from 'src/admin-payments/payments/entities/payment.entity';
import { PaymentDetails } from 'src/admin-payments/payments/entities/payment-details.entity';
import { User } from 'src/user/entities/user.entity';
import { SecondaryClientSale } from 'src/admin-sales/secondary-client/entities/secondary-client-sale.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Stage,
      Block,
      Lot,
      Lead,
      Client,
      SecondaryClient,
      Sale,
      Financing,
      FinancingInstallments,
      Payment,
      PaymentDetails,
      User,
      SecondaryClientSale,
    ]),
  ],
  controllers: [MigrationsController],
  providers: [MigrationsService],
})
export class MigrationsModule {}
