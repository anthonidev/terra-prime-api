import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import type { RequestUser } from '../interface/jwt-payload.interface';

type RequestWithUser = Request & { user?: RequestUser };

@Injectable()
export class ActiveUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    return request.user?.isActive === true;
  }
}
