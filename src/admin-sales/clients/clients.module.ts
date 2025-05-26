import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { LeadModule } from 'src/lead/lead.module';
import { GuarantorsModule } from '../guarantors/guarantors.module';

@Module({
  imports: [TypeOrmModule.forFeature([Client]), LeadModule, GuarantorsModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
