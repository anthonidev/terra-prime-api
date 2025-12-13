import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { envs } from '@config/envs';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { JwtPayload, RequestUser } from '../interface/jwt-payload.interface';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envs.jwtRefreshSecret,
    });
  }
  validate(payload: JwtPayload): RequestUser {
    return {
      id: payload.sub,
      email: payload.email,
    };
  }
}
