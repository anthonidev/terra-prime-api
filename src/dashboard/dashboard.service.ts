import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Role } from 'src/user/entities/role.entity';
import { Repository } from 'typeorm';
import { Lot } from 'src/project/entities/lot.entity';

export interface RoleCount {
  code: string;
  name: string;
  count: number;
}
export interface LotStatusCount {
  status: string;
  count: number;
}
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Lot)
    private readonly lotRepository: Repository<Lot>,
  ) {}

  async getRoleCounts(): Promise<RoleCount[]> {
    try {
      // Obtenemos todos los roles activos
      const roles = await this.roleRepository.find({
        where: { isActive: true },
        select: ['id', 'code', 'name'],
      });

      // Consultamos la cantidad de usuarios por cada rol
      const roleCounts: RoleCount[] = await Promise.all(
        roles.map(async (role) => {
          const count = await this.userRepository.count({
            where: { role: { id: role.id }, isActive: true },
          });

          return {
            code: role.code,
            name: role.name,
            count,
          };
        }),
      );

      // Ordenamos por cantidad de usuarios (mayor a menor)
      return roleCounts.sort((a, b) => b.count - a.count);
    } catch (error) {
      this.logger.error(`Error al obtener conteo de roles: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getLotStatusCounts(projectId?: string): Promise<LotStatusCount[]> {
    try {
      const statuses = ['Activo', 'Inactivo', 'Vendido', 'Separado'];
      const statusCounts: LotStatusCount[] = [];

      for (const status of statuses) {
        const queryBuilder = this.lotRepository.createQueryBuilder('lot');

        // Aplicar los joins necesarios
        queryBuilder
          .leftJoin('lot.block', 'block')
          .leftJoin('block.stage', 'stage')
          .leftJoin('stage.project', 'project');

        // Filtrar por estado
        queryBuilder.where('lot.status = :status', { status });

        // Si se proporciona un ID de proyecto, filtrar solo por ese proyecto
        if (projectId) {
          queryBuilder.andWhere('project.id = :projectId', { projectId });
        }

        const count = await queryBuilder.getCount();

        statusCounts.push({
          status,
          count,
        });
      }

      // Ordenar por cantidad (mayor a menor)
      return statusCounts.sort((a, b) => b.count - a.count);
    } catch (error) {
      this.logger.error(`Error al obtener conteo de estados de lotes: ${error.message}`, error.stack);
      throw error;
    }
  }
}