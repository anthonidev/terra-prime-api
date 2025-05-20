import { Module } from '@nestjs/common';
import { SalesModule } from './sales/sales.module';
import { ClientsModule } from './clients/clients.module';
import { SalesTypeModule } from './sales-type/sales-type.module';
import { FinancingModule } from './financing/financing.module';
import { ReservationsModule } from './reservations/reservations.module';
import { FinancingTypeModule } from './financing-type/financing-type.module';

@Module({
  imports: [SalesModule, ClientsModule, SalesTypeModule, FinancingModule, ReservationsModule, FinancingTypeModule]
})
export class AdminSalesModule {}
