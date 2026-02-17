import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parking } from './entities/parking.entity';
import { ParkingService } from './parking.service';
import { ParkingController } from './parking.controller';
import { ProjectModule } from 'src/project/project.module';

@Module({
  imports: [TypeOrmModule.forFeature([Parking]), ProjectModule],
  controllers: [ParkingController],
  providers: [ParkingService],
  exports: [ParkingService, TypeOrmModule],
})
export class ParkingModule {}
