import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import {
  PaginatedResult,
  PaginationHelper,
} from 'src/common/helpers/pagination.helper';
import { FindOptionsWhere, Repository } from 'typeorm';
import { CreateUserDto } from '../dto/create-user.dto';
import { FindUsersDto } from '../dto/find-users.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import { UserResponse } from '../interfaces/user-response.interface';
import { RoleService } from './role.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly roleService: RoleService,
  ) {}

  private async findOneOrFail(
    criteria: FindOptionsWhere<User>,
    relations: string[] = [],
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: criteria,
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'document',
        'photo',
        'isActive',
        'createdAt',
        'updatedAt',
        'password',
      ],
      relations,
    });

    if (!user) {
      throw new NotFoundException(`Usuario no encontrado`);
    }

    return user;
  }

  private async validateRoleAndEmail(
    email?: string,
    roleId?: number,
    document?: string,
  ): Promise<void> {
    if (roleId) {
      await this.roleService.findOne(roleId);
    }

    const conditions = [];
    if (email) {
      conditions.push({ email: email.toLowerCase() });
    }
    if (document) {
      conditions.push({ document });
    }

    if (conditions.length > 0) {
      const existingUser = await this.userRepository.findOne({
        where: conditions,
      });

      if (existingUser) {
        if (existingUser.email === email?.toLowerCase()) {
          throw new ConflictException('El correo electrónico ya existe');
        }
        if (existingUser.document === document) {
          throw new ConflictException('El documento ya está en uso');
        }
      }
    }
  }

  private async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.SALT_ROUNDS);
    } catch (error) {
      this.logger.error(`Error hashing password: ${error.message}`);
      throw new InternalServerErrorException('Error al procesar la contraseña');
    }
  }

  async create(dto: CreateUserDto): Promise<UserResponse> {
    await this.validateRoleAndEmail(dto.email, dto.roleId, dto.document);

    const hashedPassword = await this.hashPassword(dto.password);

    const user = this.userRepository.create({
      ...dto,
      email: dto.email.toLowerCase(),
      role: dto.roleId ? { id: dto.roleId } : undefined,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);
    const { password, ...result } = savedUser;

    return {
      ...result,
      fullName: savedUser.fullName,
    };
  }

  async findAll(
    currentUserId: string,
    filters: FindUsersDto,
  ): Promise<PaginatedResult<User>> {
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      roleId,
      order = 'DESC',
    } = filters;

    if (roleId) {
      await this.roleService.findOne(roleId);
    }

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .select([
        'user.id',
        'user.email',
        'user.firstName',
        'user.lastName',
        'user.document',
        'user.photo',
        'user.isActive',
        'user.createdAt',
        'user.updatedAt',
        'user.lastLoginAt',
        'role.id',
        'role.code',
        'role.name',
      ])
      .where('user.id != :currentUserId', { currentUserId });

    if (typeof isActive === 'boolean') {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }

    if (roleId) {
      queryBuilder.andWhere('role.id = :roleId', { roleId });
    }

    if (search?.trim()) {
      const searchTerm = search.toLowerCase().trim();
      queryBuilder.andWhere(
        '(LOWER(user.firstName) LIKE :search OR LOWER(user.lastName) LIKE :search OR LOWER(user.document) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search: `%${searchTerm}%` },
      );
    }

    queryBuilder
      .orderBy('user.updatedAt', order)
      .addOrderBy('user.createdAt', order)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, totalItems] = await queryBuilder.getManyAndCount();

    return PaginationHelper.createPaginatedResponse(items, totalItems, filters);
  }

  async findOne(id: string): Promise<User> {
    return await this.findOneOrFail({ id }, ['role']);
  }

  async findByEmail(email: string): Promise<User> {
    return await this.findOneOrFail({ email: email.toLowerCase() }, ['role']);
  }

  async findByDocument(document: string): Promise<User> {
    return await this.findOneOrFail({ document }, ['role']);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponse> {
    const user = await this.findOne(id);

    const emailToValidate =
      dto.email && dto.email !== user.email ? dto.email : undefined;
    const documentToValidate =
      dto.document && dto.document !== user.document ? dto.document : undefined;

    await this.validateRoleAndEmail(
      emailToValidate,
      dto.roleId,
      documentToValidate,
    );

    const hashedPassword = dto.password
      ? await this.hashPassword(dto.password)
      : undefined;

    const updatedUser = await this.userRepository.save({
      ...user,
      ...(dto.firstName && { firstName: dto.firstName }),
      ...(dto.lastName && { lastName: dto.lastName }),
      ...(dto.email && { email: dto.email.toLowerCase() }),
      ...(dto.document && { document: dto.document }),
      ...(dto.photo !== undefined && { photo: dto.photo }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(hashedPassword && { password: hashedPassword }),
      ...(dto.roleId && { role: { id: dto.roleId } }),
    });

    const { password, ...result } = updatedUser;
    return {
      ...result,
      fullName: updatedUser.fullName,
    };
  }

  async findOneVendor(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) throw new NotFoundException(`El usuario con ID ${id} no existe`);

    if (user.role.code !== 'VEN')
      throw new ForbiddenException(
        `El usuario asignado con ID ${id} no es un vendedor`,
      );

    return user;
  }

  async findOneCollector(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) throw new NotFoundException(`El usuario con ID ${id} no existe`);

    if (user.role.code !== 'COB')
      throw new ForbiddenException(
        `El usuario con ID ${id} no es de cobranzas`,
      );

    return user;
  }

  async findAllVendors(): Promise<User[]> {
    return await this.userRepository.find({
      where: {
        isActive: true,
        role: { code: 'VEN' },
      },
    });
  }

  async findAllCollectors(): Promise<User[]> {
    return await this.userRepository.find({
      where: {
        isActive: true,
        role: { code: 'COB' },
      },
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.userRepository.update(
        { id: userId },
        { lastLoginAt: new Date() },
      );
    } catch (error) {
      this.logger.error(
        `Error updating last login for user ${userId}: ${error.message}`,
      );
    }
  }

  async isValidSalesManager(id: string): Promise<User> {
    const user = await this.findOne(id);
    if (user.role.code !== 'JVE')
      throw new NotFoundException(
        'El usuario asignado con ID ' + id + ' no es un jefe de ventas',
      );
    return user;
  }
}
