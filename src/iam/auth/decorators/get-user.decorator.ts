import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { RequestUser } from '../interface/jwt-payload.interface';

type RequestWithUser = Request & { user?: RequestUser };

export const GetUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
