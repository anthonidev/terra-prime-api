import { forwardRef, Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from './entities/sale.entity';
import { LeadModule } from 'src/lead/lead.module';
import { UsersModule } from 'src/user/user.module';
import { ProjectModule } from 'src/project/project.module';
import { ClientsModule } from '../clients/clients.module';
import { FinancingModule } from '../financing/financing.module';
import { CommonModule } from 'src/common/common.module';
import { GuarantorsModule } from '../guarantors/guarantors.module';
import { UrbanDevelopmentModule } from '../urban-development/urban-development.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { PaymentsModule } from 'src/admin-payments/payments/payments.module';
import { SecondaryClientModule } from '../secondary-client/secondary-client.module';
import { ParticipantsModule } from '../participants/participants.module';
import { Payment } from 'src/admin-payments/payments/entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, Payment]),
    LeadModule, UsersModule,
    ProjectModule,
    ClientsModule,
    forwardRef(() => FinancingModule),
    // FinancingModule,
    CommonModule,
    GuarantorsModule,
    ReservationsModule,
    forwardRef(() => UrbanDevelopmentModule),
    PaymentsModule,
    SecondaryClientModule,
    ParticipantsModule,
    
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService, TypeOrmModule],
})
export class SalesModule {}
