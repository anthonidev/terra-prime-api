import { Module } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CollectionsController } from './collections.controller';
import { ClientsModule } from 'src/admin-sales/clients/clients.module';
import { UsersModule } from 'src/user/user.module';
import { SalesModule } from 'src/admin-sales/sales/sales.module';
import { FinancingModule } from 'src/admin-sales/financing/financing.module';
import { CommonModule } from 'src/common/common.module';
import { UrbanDevelopmentModule } from 'src/admin-sales/urban-development/urban-development.module';

@Module({
  imports: [ClientsModule, UsersModule, SalesModule, FinancingModule, CommonModule, UrbanDevelopmentModule],
  controllers: [CollectionsController],
  providers: [CollectionsService],
})
export class CollectionsModule {}
