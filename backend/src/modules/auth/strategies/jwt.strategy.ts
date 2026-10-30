import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../common/redis/redis.module';
import { claveCorteSesiones } from '../../usuarios/usuarios.service';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string; // usuario.id
  email: string;
  rol: string;
  iat?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  // El valor de retorno se inyecta como `request.user`.
  async validate(payload: JwtPayload) {
    // Si un admin cerró las sesiones de este usuario, el access token deja de servir ya.
    const corte = await this.redis.get(claveCorteSesiones(payload.sub));
    if (corte && payload.iat !== undefined && payload.iat <= Number(corte)) {
      throw new UnauthorizedException('Sesión cerrada');
    }
    return { id: payload.sub, email: payload.email, rol: payload.rol };
  }
}
