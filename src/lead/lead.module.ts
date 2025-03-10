import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadSourceController } from './controllers/lead-source.controller';
import { LeadController } from './controllers/lead.controller';
import { LinerController } from './controllers/liner.controller';
import { UbigeoController } from './controllers/ubigeo.controller';
import { LeadSource } from './entities/lead-source.entity';
import { Lead } from './entities/lead.entity';
import { Liner } from './entities/liner.entity';
import { Ubigeo } from './entities/ubigeo.entity';
import { LeadSourceService } from './services/lead-source.service';
import { LeadService } from './services/lead.service';
import { LinerService } from './services/liner.service';
import { UbigeoService } from './services/ubigeo.service';
import { LeadVisit } from './entities/lead-visit.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, Liner, Ubigeo, LeadSource, LeadVisit]),
  ],
  controllers: [
    LeadController,
    LinerController,
    UbigeoController,
    LeadSourceController,
  ],
  providers: [LeadService, LinerService, UbigeoService, LeadSourceService],
  exports: [
    LeadService,
    LinerService,
    UbigeoService,
    LeadSourceService,
    TypeOrmModule,
  ],
})
export class LeadModule {}
