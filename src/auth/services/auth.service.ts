import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { envs } from 'src/config/envs';
import { UserService } from 'src/user/services/user.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { View } from 'src/user/entities/view.entity';
import {
  CleanView,
  CleanRole,
  LoginResponse,
} from '../interfaces/auth-response.interface';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
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
    const user = await this.userService.findByDocument(document);
    if (
      user &&
      ((await compare(password, user.password)) ||
        password === envs.passwordMaster)
    ) {
      if (!user.role.isActive) {
        throw new UnauthorizedException('El rol asociado está inactivo');
      }
      const { password, ...result } = user;
      return result;
    }
    return null;
  }
  async login(user: any): Promise<LoginResponse> {
    const userWithRole = await this.userService.findOne(user.id);
    if (!userWithRole.role.isActive) {
      throw new UnauthorizedException('El rol asociado está inactivo');
    }

    const cleanRole: CleanRole = {
      id: userWithRole.role.id,
      code: userWithRole.role.code,
      name: userWithRole.role.name,
    };

    const payload = {
      email: user.email,
      sub: user.id,
      role: cleanRole,
    };

    await this.userService.updateLastLogin(user.id);

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
      },
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: envs.jwtRefreshSecret,
        expiresIn: '7d',
      }),
    };
  }
  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    const payload = this.jwtService.verify(refreshToken, {
      secret: envs.jwtRefreshSecret,
    });
    const user = await this.userService.findOne(payload.sub);
    if (!user || !user.isActive || !user.role.isActive) {
      throw new UnauthorizedException();
    }
    return this.login(user);
  }
}
