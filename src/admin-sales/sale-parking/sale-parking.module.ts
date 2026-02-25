import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleParking } from './entities/sale-parking.entity';
import { SaleParkingService } from './sale-parking.service';
import { FinancingModule } from '../financing/financing.module';
import { SalesModule } from '../sales/sales.module';
import { ParkingModule } from '../parking/parking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SaleParking]),
    FinancingModule,
    forwardRef(() => SalesModule),
    ParkingModule,
  ],
  providers: [SaleParkingService],
  exports: [SaleParkingService],
})
export class SaleParkingModule {}
