import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Guarantor } from './entities/guarantor.entity';
import { GuarantorsController } from './guarantors.controller';
import { GuarantorsService } from './guarantors.service';

@Module({
  imports: [TypeOrmModule.forFeature([Guarantor])],
  controllers: [GuarantorsController],
  providers: [GuarantorsService],
})
export class GuarantorsModule {}
