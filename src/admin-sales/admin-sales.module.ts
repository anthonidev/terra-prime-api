import { Module } from '@nestjs/common';
import { SalesModule } from './sales/sales.module';
import { ClientsModule } from './clients/clients.module';
import { FinancingModule } from './financing/financing.module';
import { ReservationsModule } from './reservations/reservations.module';
import { GuarantorsModule } from './guarantors/guarantors.module';
import { LateFeeModule } from './late-fee/late-fee.module';
import { UrbanDevelopmentModule } from './urban-development/urban-development.module';

@Module({
  imports: [SalesModule, ClientsModule, FinancingModule, ReservationsModule, GuarantorsModule, LateFeeModule, UrbanDevelopmentModule]
})
export class AdminSalesModule {}
