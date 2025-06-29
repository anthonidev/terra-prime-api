import { forwardRef, Module } from '@nestjs/common';
import { SalesModule } from './sales/sales.module';
import { ClientsModule } from './clients/clients.module';
import { FinancingModule } from './financing/financing.module';
import { ReservationsModule } from './reservations/reservations.module';
import { GuarantorsModule } from './guarantors/guarantors.module';
import { LateFeeModule } from './late-fee/late-fee.module';
import { UrbanDevelopmentModule } from './urban-development/urban-development.module';
import { SecondaryClientModule } from './secondary-client/secondary-client.module';
import { SalesWithdrawalModule } from './sales-withdrawal/sales-withdrawal.module';
import { ParticipantsModule } from './participants/participants.module';
import { RadicationModule } from './radication/radication.module';

@Module({
  imports: [
    SalesModule,
    ClientsModule,
    forwardRef(() => FinancingModule),
    ReservationsModule,
    GuarantorsModule,
    LateFeeModule,
    UrbanDevelopmentModule,
    SecondaryClientModule,
    SalesWithdrawalModule,
    ParticipantsModule,
    RadicationModule
  ]
})
export class AdminSalesModule {}
