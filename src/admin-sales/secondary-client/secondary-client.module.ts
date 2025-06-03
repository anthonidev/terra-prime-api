import { Module } from '@nestjs/common';
import { SecondaryClientService } from './secondary-client.service';
import { SecondaryClientController } from './secondary-client.controller';
import { SecondaryClient } from './entities/secondary-client.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecondaryClientSale } from './entities/secondary-client-sale.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SecondaryClient, SecondaryClientSale])],
  controllers: [SecondaryClientController],
  providers: [SecondaryClientService],
  exports: [SecondaryClientService],
})
export class SecondaryClientModule {}
