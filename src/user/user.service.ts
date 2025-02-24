import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import {
  PaginatedResult,
  PaginationHelper,
} from 'src/common/helpers/pagination.helper';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { FindUsersDto } from './dto/find-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async create(
    dto: CreateUserDto,
  ): Promise<Omit<User, 'password' | 'emailToLowerCase' | 'fullName'>> {
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('EL correo electrónico ya existe');
    }
    if (dto.roleId) {
      const role = await this.roleRepository.findOne({
        where: { id: dto.roleId, isActive: true },
      });

      if (!role) {
        throw new NotFoundException(
          `El rol con ID ${dto.roleId} no existe o no está activo`,
        );
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.userRepository.create({
      ...dto,
      ...(dto.roleId && { role: { id: dto.roleId } }),
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);
    const { password, ...result } = savedUser;
    return result;
  }

  async allRoles(): Promise<Role[]> {
    return this.roleRepository.find({
      where: { isActive: true },
      select: ['id', 'code', 'name'],
    });
  }

  async findAll(
    currentUserId: string,
    filters: FindUsersDto,
  ): Promise<PaginatedResult<User>> {
    const { page = 1, limit = 10, search, isActive, order = 'DESC' } = filters;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.id != :currentUserId', { currentUserId });

    if (typeof isActive === 'boolean') {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }

    if (search) {
      queryBuilder.andWhere(
        '(LOWER(user.firstName) LIKE LOWER(:search) OR LOWER(user.lastName) LIKE LOWER(:search) OR user.document LIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy('user.updatedAt', order)
      .addOrderBy('user.createdAt', order);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    queryBuilder.select([
      'user.id',
      'user.email',
      'user.firstName',
      'user.lastName',
      'user.document',
      'user.photo',
      'user.isActive',
      'user.createdAt',
      'user.updatedAt',
      'role.id',
      'role.code',
      'role.name',
    ]);

    const [items, totalItems] = await queryBuilder.getManyAndCount();

    return PaginationHelper.createPaginatedResponse(items, totalItems, filters);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'isActive'],
      relations: ['role'],
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('El email ya está en uso');
      }
    }

    if (dto.roleId) {
      const role = await this.roleRepository.findOne({
        where: { id: dto.roleId, isActive: true },
      });

      if (!role) {
        throw new NotFoundException(
          `El rol con ID ${dto.roleId} no existe o no está activo`,
        );
      }
    }

    try {
      await this.userRepository.save({
        id,
        ...dto,
        ...(dto.roleId && { role: { id: dto.roleId } }),
      });

      return this.findOne(id);
    } catch (error) {
      throw new InternalServerErrorException('Error al actualizar el usuario');
    }
  }
}
