import { Module } from '@nestjs/common';

import { RadicationController } from './radication.controller';
import { RadicationService } from './radication.service';

@Module({
  controllers: [RadicationController],
  providers: [RadicationService],
})
export class RadicationModule {}
