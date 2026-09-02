import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

/**
 * Limita solicitudes por número de teléfono, además del límite por IP que
 * ya aplica @nestjs/throttler en el mismo endpoint (ver ARCHITECTURE.md
 * sección 5). Cubre el caso que el límite por IP solo no cubre: alguien
 * con IPs rotativas (4G, VPN gratuita) reusando el mismo teléfono para
 * spamear /carrito/solicitud o /asesorias/solicitud.
 *
 * Usa Redis directamente (INCR + EXPIRE) en vez de otro ThrottlerGuard
 * completo, porque acá el "tracker" no es la IP sino un campo del body
 * — más simple resolverlo con un guard chico y explícito.
 */
@Injectable()
export class PhoneRateLimitGuard implements CanActivate {
  private readonly limite = 5;
  private readonly ventanaSegundos = 60 * 60; // 1 hora

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const telefono: string | undefined = request.body?.clienteTelefono;

    // Sin teléfono en el body, el ValidationPipe ya lo va a rechazar antes
    // de llegar acá (es @IsPhoneNumber requerido en ambos DTOs) — este
    // guard no duplica esa validación, solo deja pasar si no hay nada
    // que contar todavía.
    if (!telefono) {
      return true;
    }

    const key = `rate-limit:telefono:${context.switchToHttp().getRequest().route.path}:${telefono}`;
    const conteo = await this.redis.incr(key);
    if (conteo === 1) {
      await this.redis.expire(key, this.ventanaSegundos);
    }

    if (conteo > this.limite) {
      throw new HttpException(
        'Demasiadas solicitudes desde este número de teléfono. Probá de nuevo más tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
