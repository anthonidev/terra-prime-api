import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from './entities/sale.entity';
import { LeadModule } from 'src/lead/lead.module';
import { UsersModule } from 'src/user/user.module';
import { ProjectModule } from 'src/project/project.module';

@Module({
  imports: [TypeOrmModule.forFeature([Sale]), LeadModule, UsersModule, ProjectModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
