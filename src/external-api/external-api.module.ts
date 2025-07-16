import { Module } from '@nestjs/common';
import { ExternalApiService } from './external-api.service';
import { ExternalApiController } from './external-api.controller';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ProjectModule } from 'src/project/project.module';
import { SalesModule } from 'src/admin-sales/sales/sales.module';
import { LeadModule } from 'src/lead/lead.module';

@Module({
  imports: [
    ProjectModule,
    SalesModule,
    LeadModule,
  ],
  controllers: [ExternalApiController],
  providers: [ExternalApiService, ApiKeyGuard],
  exports: [ApiKeyGuard],
})
export class ExternalApiModule {}
