import { Module } from '@nestjs/common';
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

@Module({
  imports: [TypeOrmModule.forFeature([Sale]), LeadModule, UsersModule, ProjectModule, ClientsModule, FinancingModule, CommonModule, GuarantorsModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
