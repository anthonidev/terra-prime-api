import { Module } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CollectionsController } from './collections.controller';
import { ClientsModule } from 'src/admin-sales/clients/clients.module';
import { UsersModule } from 'src/user/user.module';
import { SalesModule } from 'src/admin-sales/sales/sales.module';
import { FinancingModule } from 'src/admin-sales/financing/financing.module';
import { CommonModule } from 'src/common/common.module';
import { UrbanDevelopmentModule } from 'src/admin-sales/urban-development/urban-development.module';
import { PaymentsModule } from 'src/admin-payments/payments/payments.module';
import { LeadModule } from 'src/lead/lead.module';

@Module({
  imports: [ClientsModule, UsersModule, SalesModule, FinancingModule, CommonModule, UrbanDevelopmentModule, PaymentsModule, LeadModule],
  controllers: [CollectionsController],
  providers: [CollectionsService],
})
export class CollectionsModule {}
