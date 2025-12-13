import { Module } from '@nestjs/common';
import { GuarantorsService } from './guarantors.service';
import { GuarantorsController } from './guarantors.controller';

@Module({
  controllers: [GuarantorsController],
  providers: [GuarantorsService],
})
export class GuarantorsModule {}
