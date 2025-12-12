import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssignRoleViewsDto } from '../dto/assign-role-view.dto';
import { View } from '../entities/view.entity';
import {
  CleanView,
  UserViewsResponse,
} from '../interfaces/user-response.interface';
import { RoleService } from './role.service';

@Injectable()
export class ViewService {
  private readonly logger = new Logger(ViewService.name);

  constructor(
    @InjectRepository(View)
    private readonly viewRepository: Repository<View>,
    private readonly roleService: RoleService,
  ) {}

  private cleanView(view: View): CleanView {
    const {
      id,
      code,
      name,
      icon,
      url,
      order,
      metadata,
      children: rawChildren,
    } = view;

    const children =
      rawChildren
        ?.filter((child) => child.isActive)
        .map((child) => this.cleanView(child))
        .sort((a, b) => (a.order || 0) - (b.order || 0)) || [];

    return {
      id,
      code,
      name,
      icon,
      url,
      order: order || 0,
      metadata,
      children,
    };
  }

  private buildViewTree(views: View[]): CleanView[] {
    const parentViews = views
      .filter((view) => !view.parent && view.isActive)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    return parentViews.map((view) => this.cleanView(view));
  }

  async getUserViews(roleId: number): Promise<UserViewsResponse> {
    await this.roleService.findOne(roleId);

    const roleViews = await this.viewRepository
      .createQueryBuilder('view')
      .leftJoin('view.roles', 'role')
      .where('role.id = :roleId', { roleId })
      .andWhere('view.isActive = :isActive', { isActive: true })
      .getMany();

    if (roleViews.length === 0) {
      return { views: [] };
    }

    const allowedViewIds = roleViews.map((view) => view.id);

    const viewsWithRelations = await this.viewRepository
      .createQueryBuilder('view')
      .leftJoinAndSelect('view.parent', 'parent')
      .leftJoinAndSelect(
        'view.children',
        'children',
        'children.id IN (:...allowedIds) AND children.isActive = :isActive',
        { allowedIds: allowedViewIds, isActive: true },
      )
      .where('view.id IN (:...allowedIds)', { allowedIds: allowedViewIds })
      .orderBy('view.order', 'ASC')
      .addOrderBy('children.order', 'ASC')
      .getMany();

    const viewTree = this.buildViewTree(viewsWithRelations);

    return { views: viewTree };
  }

  async deleteAll(): Promise<void> {
    const views = await this.viewRepository.find();
    if (views.length === 0) {
      throw new NotFoundException('No hay vistas para eliminar');
    }
    await this.viewRepository.remove(views);
  }

  async assignViewsToRole(assignRoleViewsDto: AssignRoleViewsDto) {
    const role = await this.roleService.findByCode(assignRoleViewsDto.code);

    const processedViews = await this.processViews(assignRoleViewsDto.views);

    const allViewCodes = this.getAllViewCodes(assignRoleViewsDto.views);
    const viewsToAssign = await this.viewRepository.find({
      where: allViewCodes.map((code) => ({ code })),
    });

    role.views = viewsToAssign;
    await this.roleService.findByCode(assignRoleViewsDto.code);

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
    let existingView = await this.viewRepository.findOne({
      where: { code: viewData.code.toUpperCase() },
      relations: ['parent'],
    });

    if (existingView) {
      existingView.name = viewData.name.trim();
      existingView.url = viewData.url || null;
      existingView.icon = viewData.icon || null;
      existingView.order = viewData.order || 0;
      existingView.parent = parentView || null;

      const savedView = await this.viewRepository.save(existingView);
      this.logger.debug(`Vista actualizada: ${viewData.code}`);
      return { view: savedView, isNew: false };
    } else {
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
