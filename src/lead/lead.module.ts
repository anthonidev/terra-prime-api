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
import { BulkLeadController } from './controllers/bulk-lead.controller';
import { BulkLeadService } from './services/bulk-lead.service';
import { UsersModule } from 'src/user/user.module';
import { CommonModule } from 'src/common/common.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, Liner, Ubigeo, LeadSource, LeadVisit]),
    UsersModule,
    CommonModule,
  ],
  controllers: [
    LeadController,
    LinerController,
    UbigeoController,
    LeadSourceController,
    BulkLeadController
  ],
  providers: [
    LeadService,
    LinerService,
    UbigeoService,
    LeadSourceService,
    BulkLeadService,
  ],
  exports: [
    LeadService,
    LinerService,
    UbigeoService,
    LeadSourceService,
    BulkLeadService,
    TypeOrmModule
  ],
})
export class LeadModule {}
