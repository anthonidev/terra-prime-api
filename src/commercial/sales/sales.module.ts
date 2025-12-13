import { Module } from '@nestjs/common';

import { ClientsModule } from './stakeholders/clients/clients.module';
import { GuarantorsModule } from './stakeholders/guarantors/guarantors.module';
import { ParticipantsModule } from './stakeholders/participants/participants.module';
import { SecondaryClientModule } from './stakeholders/secondary-client/secondary-client.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { ContractModule } from './transaction/contract/contract.module';
import { ReservationModule } from './transaction/reservation/reservation.module';
import { WithdrawalsModule } from './transaction/withdrawals/withdrawals.module';
import { FinancingModule } from './terms/financing/financing.module';
import { UrbanDevelopmentModule } from './terms/urban-development/urban-development.module';
import { RadicationModule } from './documents/radication/radication.module';

@Module({
  controllers: [SalesController],
  providers: [SalesService],
  imports: [ClientsModule, GuarantorsModule, ParticipantsModule, SecondaryClientModule, ContractModule, ReservationModule, WithdrawalsModule, FinancingModule, UrbanDevelopmentModule, RadicationModule],
})
export class SalesModule {}
