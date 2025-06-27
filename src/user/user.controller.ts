import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UsersService } from './user.service';
import { PaginatedResult } from 'src/common/helpers/pagination.helper';
import { FindUsersDto } from './dto/find-users.dto';
import { AssignRoleViewsDto } from './dto/assign-role-view.dto';
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Post()
  @Roles('SYS')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
  @Get()
  @Roles('SYS')
  async findAll(
    @GetUser() user: User,
    @Query() findUsersDto: FindUsersDto,
  ): Promise<PaginatedResult<User>> {
    return this.usersService.findAll(user.id, findUsersDto);
  }
  @Patch(':id')
  @Roles('SYS')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }
  @Get('roles')
  @Roles('SYS')
  allRoles() {
    return this.usersService.allRoles();
  }

  @Get('roles/delete')
  @Roles('SYS')
  deleteAllRoles() {
    return this.usersService.deleteAllRoles();
  }
  @Post('assign-to-role')
  @Roles('SYS')
  async assignViewsToRole(@Body() assignRoleViewsDto: AssignRoleViewsDto) {
    return this.usersService.assignViewsToRole(assignRoleViewsDto);
  }
}
