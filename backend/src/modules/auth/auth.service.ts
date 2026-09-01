import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';
import { CreateUsuarioDto } from '../usuarios/dto/create-usuario.dto';
import { UsuarioResponseDto } from '../usuarios/dto/usuario-response.dto';
import { RolUsuario } from '../usuarios/entities/usuario.entity';

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

    // Mensaje deliberadamente genérico: no revelar si el email existe o no.
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValido = await bcrypt.compare(
      dto.password,
      usuario.passwordHash,
    );
    if (!passwordValido) {
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

      const usuario = await this.usuariosService.findOne(payload.sub);
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
