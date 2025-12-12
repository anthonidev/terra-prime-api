import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async findAll(): Promise<Role[]> {
    return await this.roleRepository.find({
      where: { isActive: true },
      select: ['id', 'code', 'name'],
      cache: true,
    });
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id, isActive: true },
      relations: ['views'],
    });

    if (!role) {
      throw new NotFoundException(
        `El rol con ID ${id} no existe o no está activo`,
      );
    }

    return role;
  }

  async findByCode(code: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { code: code.toUpperCase() },
      relations: ['views'],
    });

    if (!role) {
      throw new NotFoundException(`El rol con código ${code} no existe`);
    }

    return role;
  }

  async deleteAll(): Promise<void> {
    const roles = await this.roleRepository.find();
    if (roles.length === 0) {
      throw new NotFoundException('No hay roles para eliminar');
    }
    await this.roleRepository.remove(roles);
  }
}
