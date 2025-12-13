import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminToken } from './entities/admin-token.entity';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminToken])],

  controllers: [ApprovalsController],
  providers: [ApprovalsService],
})
export class ApprovalsModule {}
