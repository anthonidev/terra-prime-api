import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators/is-public.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import {
  ApiAssignViewsToRole,
  ApiDeleteAllViews,
} from '../decorators/view-api.decorators';
import { AssignRoleViewsDto } from '../dto/assign-role-view.dto';
import { ViewService } from '../services/view.service';

@ApiTags('Views')
@Controller('views')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ViewController {
  constructor(private readonly viewService: ViewService) {}

  @Delete()
  @Roles('SYS')
  @ApiBearerAuth('JWT-auth')
  @ApiDeleteAllViews()
  deleteAll() {
    return this.viewService.deleteAll();
  }

  @Post('assign-to-role')
  @Public()
  @ApiAssignViewsToRole()
  async assignViewsToRole(@Body() assignRoleViewsDto: AssignRoleViewsDto) {
    return this.viewService.assignViewsToRole(assignRoleViewsDto);
  }
}
