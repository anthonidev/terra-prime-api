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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import {
  ApiCreateUser,
  ApiFindAllUsers,
  ApiGetUserMenu,
  ApiUpdateUser,
} from '../decorators/user-api.decorators';
import { CreateUserDto } from '../dto/create-user.dto';
import { FindUsersDto } from '../dto/find-users.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import { UserService } from '../services/user.service';
import { ViewService } from '../services/view.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly viewService: ViewService,
  ) {}

  @Post()
  @Roles('SYS')
  @ApiCreateUser()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @Roles('SYS')
  @ApiFindAllUsers()
  async findAll(@GetUser() user: User, @Query() findUsersDto: FindUsersDto) {
    return this.userService.findAll(user.id, findUsersDto);
  }

  @Patch(':id')
  @Roles('SYS')
  @ApiUpdateUser()
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Get('menu')
  @ApiGetUserMenu()
  async getUserMenu(@GetUser() user: User) {
    return this.viewService.getUserViews(user.role.id);
  }
}
