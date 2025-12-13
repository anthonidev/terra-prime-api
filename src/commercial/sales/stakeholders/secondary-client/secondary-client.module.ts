import { Module } from '@nestjs/common';
import { SecondaryClientService } from './secondary-client.service';
import { SecondaryClientController } from './secondary-client.controller';

@Module({
  controllers: [SecondaryClientController],
  providers: [SecondaryClientService],
})
export class SecondaryClientModule {}
