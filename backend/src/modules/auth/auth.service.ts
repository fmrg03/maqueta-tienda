import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';
import { CreateUsuarioDto } from '../usuarios/dto/create-usuario.dto';
import { UsuarioResponseDto } from '../usuarios/dto/usuario-response.dto';
import { RolUsuario } from '../usuarios/entities/usuario.entity';

const BCRYPT_SALT_ROUNDS = 12;

export interface TokensResponse {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
    const tokens = await this.generarTokens(usuario.id, usuario.email, usuario.rol);
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

    const tokens = await this.generarTokens(usuario.id, usuario.email, usuario.rol);
    return { usuario: new UsuarioResponseDto(usuario), ...tokens };
  }

  async refresh(refreshToken: string): Promise<TokensResponse> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const usuario = await this.usuariosService.findOneParaRefresh(payload.sub);
      if (!usuario.activo) {
        throw new UnauthorizedException('Usuario inactivo');
      }

      return this.generarTokens(usuario.id, usuario.email, usuario.rol);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  private async generarTokens(
    userId: string,
    email: string,
    rol: string,
  ): Promise<TokensResponse> {
    const payload = { sub: userId, email, rol };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
