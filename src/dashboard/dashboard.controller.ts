import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { DashboardService, LotStatusCount, RoleCount } from './dashboard.service';
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}
  @Get('role-counts')
  @Roles('SYS', 'JVE', 'ADM')
  async getRoleCounts(): Promise<RoleCount[]> {
    return this.dashboardService.getRoleCounts();
  }
  @Get('lot-status-counts')
  @Roles('SYS', 'JVE', 'VEN')
  async getLotStatusCounts(
    @Query('projectId') projectId?: string
  ): Promise<LotStatusCount[]> {
    return this.dashboardService.getLotStatusCounts(projectId);
  }
}
