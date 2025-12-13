import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Lead } from './entities/lead.entity';
import { LeadSource } from './entities/lead-source.entity';
import { LeadVisit } from './entities/lead-visit.entity';
import { Ubigeo } from './entities/ubigeo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, Ubigeo, LeadSource, LeadVisit])],
  controllers: [],
  providers: [],
})
export class LeadsModule {}
