import { forwardRef, Module } from '@nestjs/common';
import { UrbanDevelopmentService } from './urban-development.service';
import { UrbanDevelopmentController } from './urban-development.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UrbanDevelopment } from './entities/urban-development.entity';
import { FinancingModule } from '../financing/financing.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UrbanDevelopment]),
    FinancingModule,
    forwardRef(() => SalesModule)
  ],
  controllers: [UrbanDevelopmentController],
  providers: [UrbanDevelopmentService],
  exports: [UrbanDevelopmentService],
})
export class UrbanDevelopmentModule {}
