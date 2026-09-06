import {
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import type Redis from 'ioredis';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';
import { CreateUsuarioDto } from '../usuarios/dto/create-usuario.dto';
import { UsuarioResponseDto } from '../usuarios/dto/usuario-response.dto';
import { RolUsuario } from '../usuarios/entities/usuario.entity';
import { REDIS_CLIENT } from '../../common/redis/redis.module';

const BCRYPT_SALT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_SEGUNDOS = 7 * 24 * 60 * 60; // 7 días — vida máxima de una sesión

export interface TokensResponse {
  accessToken: string;
  refreshToken: string;
}

interface RefreshPayload {
  sub: string;
  familyId: string;
  jti: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // Hash bcrypt de una password que nadie va a escribir jamás — se usa
  // únicamente para que bcrypt.compare() tarde lo mismo cuando el
  // usuario NO existe que cuando SÍ existe (ver abajo). Generarlo una
  // sola vez al cargar el módulo evita el costo de un hash nuevo en cada
  // login fallido.
  private readonly hashDummyParaTimingConstante = bcrypt.hashSync(
    crypto.randomUUID(),
    BCRYPT_SALT_ROUNDS,
  );

  // Auto-registro público: SIEMPRE crea un usuario 'cliente', sin importar
  // qué rol venga en el DTO. Crear admin/ventas/asesor es exclusivo del
  // endpoint administrado POST /usuarios (protegido por RolesGuard) — de
  // lo contrario cualquiera podría auto-otorgarse un rol privilegiado
  // desde este endpoint público.
  async register(
    dto: CreateUsuarioDto,
  ): Promise<{ usuario: UsuarioResponseDto } & TokensResponse> {
    const usuario = await this.usuariosService.create(
      { ...dto, rol: RolUsuario.CLIENTE },
      { esRegistroPublico: true },
    );
    const tokens = await this.generarTokensNuevaSesion(
      usuario.id,
      usuario.email,
      usuario.rol,
    );
    return { usuario: new UsuarioResponseDto(usuario), ...tokens };
  }

  async login(
    dto: LoginDto,
  ): Promise<{ usuario: UsuarioResponseDto } & TokensResponse> {
    const usuario = await this.usuariosService.findByEmailConPassword(
      dto.email,
    );

    // Timing attack real, encontrado midiendo tiempos de respuesta: sin
    // esto, "usuario no existe" respondía en ~3ms (corta antes de
    // bcrypt.compare) contra ~280ms cuando sí existe (corre
    // bcrypt.compare) — una diferencia de ~277ms, trivial de detectar y
    // suficiente para enumerar qué emails están registrados. Corremos
    // bcrypt.compare() SIEMPRE, contra un hash dummy si el usuario no
    // existe, para que el tiempo sea equivalente en ambos casos.
    const passwordValido = await bcrypt.compare(
      dto.password,
      usuario?.passwordHash ?? this.hashDummyParaTimingConstante,
    );

    // Mensaje deliberadamente genérico: no revelar si el email existe o no.
    if (!usuario || !usuario.activo || !passwordValido) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.generarTokensNuevaSesion(
      usuario.id,
      usuario.email,
      usuario.rol,
    );
    return { usuario: new UsuarioResponseDto(usuario), ...tokens };
  }

  /**
   * Rotación de refresh tokens con detección de reuso — cada refresh
   * token es de un solo uso. En Redis se guarda, por "familia" de sesión
   * (todos los tokens nacidos del mismo login), cuál es el único jti
   * válido en este momento:
   *
   *   - Si el jti presentado coincide con el guardado: válido, de un
   *     solo uso — se genera un token nuevo, se actualiza Redis, y el
   *     usado queda inservible para siempre.
   *   - Si el jti presentado NO coincide con el guardado (alguien
   *     reusa un token que ya fue canjeado antes): es la señal clásica
   *     de que un refresh token fue robado y usado por dos partes — se
   *     revoca la familia completa de inmediato, forzando un login
   *     nuevo, aunque quien lo presente sea el dueño legítimo.
   *   - Si la familia no existe en Redis (ya expiró su TTL, o fue
   *     revocada por logout o por el punto anterior): rechazado.
   */
  async refresh(refreshToken: string): Promise<TokensResponse> {
    let payload: RefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const key = this.claveFamilia(payload.familyId);
    const jtiVigente = await this.redis.get(key);

    if (!jtiVigente) {
      throw new UnauthorizedException('Sesión expirada o cerrada');
    }

    if (jtiVigente !== payload.jti) {
      // Reuso detectado: se revoca toda la familia, sin excepción.
      await this.redis.del(key);
      throw new UnauthorizedException(
        'Refresh token reusado — la sesión fue revocada por seguridad',
      );
    }

    const usuario = await this.usuariosService.findOneParaRefresh(payload.sub);
    if (!usuario.activo) {
      await this.redis.del(key);
      throw new UnauthorizedException('Usuario inactivo');
    }

    const ttlRestante = await this.redis.ttl(key);
    return this.generarTokens(
      usuario.id,
      usuario.email,
      usuario.rol,
      payload.familyId,
      ttlRestante > 0 ? ttlRestante : REFRESH_TOKEN_TTL_SEGUNDOS,
    );
  }

  /**
   * Logout real: revoca la familia de sesión del lado del servidor, no
   * solo borra el token en el cliente. Cualquier refresh token de esa
   * familia (incluso uno que el usuario no haya usado todavía) deja de
   * servir de inmediato. El access token en curso sigue siendo válido
   * hasta sus 15 minutos — es un JWT sin estado, no se puede revocar
   * antes de su propia expiración sin agregar otra capa de tracking.
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshPayload>(
        refreshToken,
        { secret: this.configService.get<string>('JWT_REFRESH_SECRET') },
      );
      await this.redis.del(this.claveFamilia(payload.familyId));
    } catch {
      // Token ya inválido/expirado — el resultado deseado (que no sirva)
      // ya se cumple solo, no hace falta informar error al cliente.
    }
  }

  private claveFamilia(familyId: string): string {
    return `refresh:familia:${familyId}`;
  }

  private async generarTokensNuevaSesion(
    userId: string,
    email: string,
    rol: string,
  ): Promise<TokensResponse> {
    return this.generarTokens(
      userId,
      email,
      rol,
      crypto.randomUUID(),
      REFRESH_TOKEN_TTL_SEGUNDOS,
    );
  }

  private async generarTokens(
    userId: string,
    email: string,
    rol: string,
    familyId: string,
    ttlSegundos: number,
  ): Promise<TokensResponse> {
    const jti = crypto.randomUUID();
    const payloadAccess = { sub: userId, email, rol };
    const payloadRefresh = { sub: userId, familyId, jti };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payloadAccess, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payloadRefresh, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: ttlSegundos,
      }),
    ]);

    await this.redis.set(this.claveFamilia(familyId), jti, 'EX', ttlSegundos);

    return { accessToken, refreshToken };
  }
}
