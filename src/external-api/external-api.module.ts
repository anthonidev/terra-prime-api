import { Module } from '@nestjs/common';
import { ExternalApiService } from './external-api.service';
import { ExternalApiController } from './external-api.controller';
import { ApiKeyGuard } from './guards/api-key.guard';

@Module({
  controllers: [ExternalApiController],
  providers: [ExternalApiService, ApiKeyGuard],
  exports: [ApiKeyGuard],
})
export class ExternalApiModule {}
