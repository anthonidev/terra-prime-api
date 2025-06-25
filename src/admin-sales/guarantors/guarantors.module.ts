import { Module } from '@nestjs/common';
import { GuarantorsService } from './guarantors.service';
import { GuarantorsController } from './guarantors.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guarantor } from './entities/guarantor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Guarantor])],
  controllers: [GuarantorsController],
  providers: [GuarantorsService],
  exports: [GuarantorsService, TypeOrmModule],
})
export class GuarantorsModule {}
