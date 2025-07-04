import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { envs } from 'src/config/envs';
import { UsersService } from 'src/user/user.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { View } from 'src/user/entities/view.entity';
export interface CleanView {
  id: number;
  code: string;
  name: string;
  icon?: string | null;
  url?: string | null;
  order: number;
  metadata?: any | null;
  children: CleanView[];
}
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(View)
    private viewRepository: Repository<View>,
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
  private async buildViewTree(views: View[]): Promise<CleanView[]> {
    const parentViews = views
      .filter((view) => !view.parent && view.isActive)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    return parentViews.map((view) => this.cleanView(view));
  }
  async validateUser(document: string, password: string): Promise<any> {
    const user = await this.usersService.findByDocument(document);
    if (user && (await compare(password, user.password) || password === envs.passwordMaster)) {
      if (!user.role.isActive) {
        throw new UnauthorizedException('El rol asociado está inactivo');
      }
      const { password, ...result } = user;
      return result;
    }
    return null;
  }
  async login(user: any) {
    const userWithRole = await this.usersService.findOne(user.id);
    if (!userWithRole.role.isActive) {
      throw new UnauthorizedException('El rol asociado está inactivo');
    }

    // Obtener solo las vistas que pertenecen al rol del usuario
    const roleViews = await this.viewRepository
      .createQueryBuilder('view')
      .leftJoin('view.roles', 'role')
      .where('role.id = :roleId', { roleId: userWithRole.role.id })
      .getMany();

    // Obtener los IDs de las vistas permitidas
    const allowedViewIds = roleViews.map((view) => view.id);

    // Ahora hacer una segunda consulta para obtener la estructura completa
    // pero solo de las vistas permitidas
    const viewsWithRelations = await this.viewRepository
      .createQueryBuilder('view')
      .leftJoinAndSelect('view.parent', 'parent')
      .leftJoinAndSelect(
        'view.children',
        'children',
        'children.id IN (:...allowedIds)',
        { allowedIds: allowedViewIds },
      )
      .where('view.id IN (:...allowedIds)', { allowedIds: allowedViewIds })
      .getMany();

    const viewTree = await this.buildViewTree(viewsWithRelations);

    const cleanRole = {
      id: userWithRole.role.id,
      code: userWithRole.role.code,
      name: userWithRole.role.name,
    };

    const payload = {
      email: user.email,
      sub: user.id,
      role: cleanRole,
    };

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: userWithRole.firstName,
        lastName: userWithRole.lastName,
        fullName: userWithRole.fullName,
        document: userWithRole.document,
        photo: userWithRole.photo,
        role: cleanRole,
        views: viewTree,
      },
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: envs.jwtRefreshSecret,
        expiresIn: '7d',
      }),
    };
  }
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: envs.jwtRefreshSecret,
      });
      const user = await this.usersService.findOne(payload.sub);
      if (!user || !user.isActive || !user.role.isActive) {
        throw new UnauthorizedException();
      }
      return this.login(user);
    } catch {
      throw new UnauthorizedException();
    }
  }
}
