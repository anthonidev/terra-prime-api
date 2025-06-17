import { Module } from '@nestjs/common';
import { CollectionsModule } from './collections/collections.module';
import { UrbanDevelopmentModule } from 'src/admin-sales/urban-development/urban-development.module';

@Module({
  imports: [CollectionsModule]
})
export class AdminCollectionsModule {}
