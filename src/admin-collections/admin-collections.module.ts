import { Module } from '@nestjs/common';
import { CollectionsModule } from './collections/collections.module';

@Module({
  imports: [CollectionsModule]
})
export class AdminCollectionsModule {}
