import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DEFAULT_JWT_SECRET } from '@readme/shared-types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET,
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    firstName: string;
    lastName: string;
  }) {
    return payload;
  }
}
