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

  @Post('views-data')
  seedViewsData() {
    return this.seedService.seedViews();
  }

  @Post('roles-data')
  seedRolesData() {
    return this.seedService.seedRoles();
  }

  @Post('user-system-data')
  seedSystemUser() {
    return this.seedService.seedSystemUser();
  }
}
