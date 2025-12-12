import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ApiFindAllRoles } from '../decorators/role-api.decorators';
import { RoleService } from '../services/role.service';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @Roles('SYS')
  @ApiFindAllRoles()
  findAll() {
    return this.roleService.findAll();
  }
}
