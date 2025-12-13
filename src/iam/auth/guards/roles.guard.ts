import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { ROLES_KEY } from '../decorators/roles.decorator';
import type { RequestUser } from '../interface/jwt-payload.interface';

type RequestWithUser = Request & { user?: RequestUser };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const roleCode = request.user?.role?.code;
    if (typeof roleCode !== 'string') {
      return false;
    }
    return requiredRoles.includes(roleCode);
  }
}
