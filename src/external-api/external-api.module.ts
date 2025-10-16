import { forwardRef, Module } from '@nestjs/common';
import { ExternalApiService } from './external-api.service';
import { ExternalApiController } from './external-api.controller';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ProjectModule } from 'src/project/project.module';
import { SalesModule } from 'src/admin-sales/sales/sales.module';
import { LeadModule } from 'src/lead/lead.module';
import { FinancingModule } from 'src/admin-sales/financing/financing.module';
import { NexusApiService } from './nexus-api.service';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    ProjectModule,
    forwardRef(() => SalesModule),
    LeadModule,
    forwardRef(() => FinancingModule),
    CommonModule,
  ],
  controllers: [ExternalApiController],
  providers: [ExternalApiService, ApiKeyGuard, NexusApiService],
  exports: [ApiKeyGuard, NexusApiService],
})
export class ExternalApiModule {}
