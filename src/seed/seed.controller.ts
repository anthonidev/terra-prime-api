import { Controller, Post } from '@nestjs/common';
import { SeedService } from './seed.service';
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}
  @Post()
  executeSeed() {
    return this.seedService.seedAll();
  }

  @Post('payment-configs')
  seedPaymentConfigs() {
    return this.seedService.seedPaymentConfigs();
  }

  @Post('cut-configs')
  seedCutConfigurations() {
    return this.seedService.seedCutConfigurations();
  }
}
