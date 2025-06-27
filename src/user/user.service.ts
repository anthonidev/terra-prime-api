import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { FindOptionsWhere, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { FindUsersDto } from './dto/find-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import {
  PaginatedResult,
  PaginationHelper,
} from 'src/common/helpers/pagination.helper';
import { AssignRoleViewsDto } from './dto/assign-role-view.dto';
import { View } from './entities/view.entity';
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 10;
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(View)
    private readonly viewRepository: Repository<View>,
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
  ): Promise<void> {
    if (email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
      });
      if (existingUser) {
        throw new ConflictException('El correo electrónico ya existe');
      }
    }
    if (roleId) {
      const role = await this.roleRepository.findOne({
        where: { id: roleId, isActive: true },
      });
      if (!role) {
        throw new NotFoundException(
          `El rol con ID ${roleId} no existe o no está activo`,
        );
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
  async create(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
    try {
      await this.validateRoleAndEmail(dto.email, dto.roleId);
      const hashedPassword = await this.hashPassword(dto.password);
      const user = this.userRepository.create({
        ...dto,
        email: dto.email.toLowerCase(),
        role: dto.roleId ? { id: dto.roleId } : undefined,
        password: hashedPassword,
      });
      const savedUser = await this.userRepository.save(user);
      const { password, emailToLowerCase, fullName, ...result } = savedUser;
      return { ...result, emailToLowerCase, fullName };
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`);
      throw error instanceof ConflictException ||
        error instanceof NotFoundException
        ? error
        : new InternalServerErrorException('Error al crear el usuario');
    }
  }
  async allRoles(): Promise<Role[]> {
    try {
      return await this.roleRepository.find({
        where: { isActive: true },
        select: ['id', 'code', 'name'],
        cache: true,
      });
    } catch (error) {
      this.logger.error(`Error fetching roles: ${error.message}`);
      throw new InternalServerErrorException('Error al obtener los roles');
    }
  }
  async findAll(
    currentUserId: string,
    filters: FindUsersDto,
  ): Promise<PaginatedResult<User>> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        isActive,
        order = 'DESC',
      } = filters;
      const queryBuilder = this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .where('user.id != :currentUserId', { currentUserId });
      if (typeof isActive === 'boolean') {
        queryBuilder.andWhere('user.isActive = :isActive', { isActive });
      }
      if (search?.trim()) {
        const searchTerm = search.toLowerCase().trim();
        queryBuilder.andWhere(
          '(LOWER(user.firstName) LIKE :search OR LOWER(user.lastName) LIKE :search OR user.document LIKE :search)',
          { search: `%${searchTerm}%` },
        );
      }
      queryBuilder
        .orderBy('user.updatedAt', order)
        .addOrderBy('user.createdAt', order)
        .skip((page - 1) * limit)
        .take(limit)
        .select([
          'user.id',
          'user.email',
          'user.firstName',
          'user.lastName',
          'user.document',
          'user.password',
          'user.photo',
          'user.isActive',
          'user.createdAt',
          'user.updatedAt',
          'role.id',
          'role.code',
          'role.name',
        ]);
      const [items, totalItems] = await queryBuilder.getManyAndCount();
      return PaginationHelper.createPaginatedResponse(
        items,
        totalItems,
        filters,
      );
    } catch (error) {
      this.logger.error(`Error fetching users: ${error.message}`);
      throw new InternalServerErrorException('Error al obtener los usuarios');
    }
  }
  async findOne(id: string): Promise<User> {
    try {
      return await this.findOneOrFail({ id }, ['role']);
    } catch (error) {
      this.logger.error(`Error fetching user ${id}: ${error.message}`);
      throw error;
    }
  }
  async findByEmail(email: string): Promise<User> {
    try {
      return await this.findOneOrFail({ email: email.toLowerCase() }, ['role']);
    } catch (error) {
      this.logger.error(
        `Error fetching user by email ${email}: ${error.message}`,
      );
      throw error;
    }
  }
  async update(id: string, dto: UpdateUserDto): Promise<User> {
    try {
      const user = await this.findOne(id);
      await this.validateRoleAndEmail(
        dto.email !== user.email ? dto.email : null,
        dto.roleId,
      );
      const updatedUser = await this.userRepository.save({
        ...user,
        ...dto,
        email: dto.email?.toLowerCase() || user.email,
        role: dto.roleId ? { id: dto.roleId } : user.role,
      });
      return updatedUser;
    } catch (error) {
      this.logger.error(`Error updating user ${id}: ${error.message}`);
      throw error instanceof NotFoundException ||
        error instanceof ConflictException
        ? error
        : new InternalServerErrorException('Error al actualizar el usuario');
    }
  }

  async findOneVendor(id: string): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
        relations: ['role'],
      });
      if (!user)
        throw new NotFoundException(`El usuario con ID ${id} no existe`);
      if (user.role.code !== 'VEN')
        throw new ForbiddenException(
          `El usuario asignado con ID ${id} no es un vendedor`,
        );
      return user;
    } catch (error) {
      this.logger.error(`Error fetching user ${id}: ${error.message}`);
      throw error;
    }
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
    try {
      const users = await this.userRepository.find({
        where: {
          isActive: true,
          role: { code: 'VEN' },
        },
      });
      return users;
    } catch (error) {
      this.logger.error(`Error fetching vendors: ${error.message}`);
      throw new InternalServerErrorException('Error al obtener los vendedores');
    }
  }

  async findAllCollectors(): Promise<User[]> {
    try {
      const users = await this.userRepository.find({
        where: {
          isActive: true,
          role: { code: 'COB' },
        },
      });
      return users;
    } catch (error) {
      this.logger.error(`Error fetching collectors: ${error.message}`);
      throw new InternalServerErrorException('Error al obtener los cobradores');
    }
  }

  async isValidSalesManager(id: string): Promise<User> {
    try {
      const user = await this.findOne(id);
      if (user.role.code !== 'JVE')
        throw new NotFoundException(
          'El usuario asignado con ID ' + id + ' no es un jefe de ventas',
        );
      return user;
    } catch (error) {
      this.logger.error(`Error fetching user ${id}: ${error.message}`);
      throw error;
    }
  }

  async deleteAllRoles(): Promise<void> {
    try {
      const roles = await this.roleRepository.find();
      if (roles.length === 0) {
        throw new NotFoundException('No hay roles para eliminar');
      }
      await this.roleRepository.remove(roles);
    } catch (error) {
      this.logger.error(`Error deleting all roles: ${error.message}`);
      throw new InternalServerErrorException('Error al eliminar los roles');
    }
  }
  async deleteAllViews(): Promise<void> {
    try {
      const views = await this.viewRepository.find();
      if (views.length === 0) {
        throw new NotFoundException('No hay vistas para eliminar');
      }
      await this.viewRepository.remove(views);
    } catch (error) {
      this.logger.error(`Error deleting all views: ${error.message}`);
      throw new InternalServerErrorException('Error al eliminar las vistas');
    }
  }
  async assignViewsToRole(assignRoleViewsDto: AssignRoleViewsDto) {
    try {
      // 1. Verificar que el rol existe
      const role = await this.roleRepository.findOne({
        where: { code: assignRoleViewsDto.code },
        relations: ['views'],
      });

      if (!role) {
        throw new NotFoundException(
          `El rol con código ${assignRoleViewsDto.code} no existe`,
        );
      }

      // 2. Procesar las vistas recursivamente
      const processedViews = await this.processViews(assignRoleViewsDto.views);

      // 3. Obtener todas las vistas creadas/actualizadas para asignar al rol
      const allViewCodes = this.getAllViewCodes(assignRoleViewsDto.views);
      const viewsToAssign = await this.viewRepository.find({
        where: allViewCodes.map((code) => ({ code })),
      });

      // 4. Asignar las vistas al rol
      role.views = viewsToAssign;
      await this.roleRepository.save(role);

      this.logger.log(
        `Vistas asignadas exitosamente al rol ${assignRoleViewsDto.code}`,
      );

      return {
        message: 'Vistas asignadas exitosamente al rol',
        role: {
          id: role.id,
          code: role.code,
          name: role.name,
        },
        viewsAssigned: viewsToAssign.length,
        processedViews,
      };
    } catch (error) {
      this.logger.error(
        `Error asignando vistas al rol ${assignRoleViewsDto.code}: ${error.message}`,
      );
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(
            'Error al asignar las vistas al rol',
          );
    }
  }
  private async processViews(
    views: any[],
    parentView?: View,
  ): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const viewData of views) {
      const result = await this.createOrUpdateView(viewData, parentView);
      if (result.isNew) {
        created++;
      } else {
        updated++;
      }

      // Procesar hijos si existen
      if (viewData.children && viewData.children.length > 0) {
        const childResults = await this.processViews(
          viewData.children,
          result.view,
        );
        created += childResults.created;
        updated += childResults.updated;
      }
    }

    return { created, updated };
  }

  private async createOrUpdateView(
    viewData: any,
    parentView?: View,
  ): Promise<{ view: View; isNew: boolean }> {
    // Verificar si la vista ya existe
    let existingView = await this.viewRepository.findOne({
      where: { code: viewData.code.toUpperCase() },
      relations: ['parent'],
    });

    if (existingView) {
      // Actualizar vista existente
      existingView.name = viewData.name.trim();
      existingView.url = viewData.url || null;
      existingView.icon = viewData.icon || null;
      existingView.order = viewData.order || 0;
      existingView.parent = parentView || null;

      const savedView = await this.viewRepository.save(existingView);
      this.logger.debug(`Vista actualizada: ${viewData.code}`);
      return { view: savedView, isNew: false };
    } else {
      // Crear nueva vista
      const newView = this.viewRepository.create({
        code: viewData.code.toUpperCase(),
        name: viewData.name.trim(),
        url: viewData.url || null,
        icon: viewData.icon || null,
        order: viewData.order || 0,
        parent: parentView || null,
        isActive: true,
      });

      const savedView = await this.viewRepository.save(newView);
      this.logger.debug(`Vista creada: ${viewData.code}`);
      return { view: savedView, isNew: true };
    }
  }
  private getAllViewCodes(views: any[]): string[] {
    const codes: string[] = [];

    for (const view of views) {
      codes.push(view.code.toUpperCase());

      if (view.children && view.children.length > 0) {
        codes.push(...this.getAllViewCodes(view.children));
      }
    }

    return codes;
  }
}
