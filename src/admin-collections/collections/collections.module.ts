import { Module } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CollectionsController } from './collections.controller';
import { ClientsModule } from 'src/admin-sales/clients/clients.module';
import { UsersModule } from 'src/user/user.module';
import { SalesModule } from 'src/admin-sales/sales/sales.module';
import { FinancingModule } from 'src/admin-sales/financing/financing.module';

@Module({
  imports: [ClientsModule, UsersModule, SalesModule, FinancingModule],
  controllers: [CollectionsController],
  providers: [CollectionsService],
})
export class CollectionsModule {}
