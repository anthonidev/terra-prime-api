import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SecondaryClient } from './entities/secondary-client.entity';
import { SecondaryClientSale } from './entities/secondary-client-sale.entity';
import { SecondaryClientController } from './secondary-client.controller';
import { SecondaryClientService } from './secondary-client.service';

@Module({
  imports: [TypeOrmModule.forFeature([SecondaryClient, SecondaryClientSale])],
  controllers: [SecondaryClientController],
  providers: [SecondaryClientService],
})
export class SecondaryClientModule {}
