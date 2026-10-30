import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usuariosService: UsuariosService,
  ) {}

  // Cualquier persona con sesión cambia SU contraseña; se cierran sus sesiones
  // y debe volver a iniciar con la nueva.
  @Post('cambiar-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async cambiarPassword(@Body() dto: CambiarPasswordDto, @Req() request: any) {
    await this.usuariosService.cambiarPasswordPropia(request.user.id, dto.actual, dto.nueva);
    return { mensaje: 'Contraseña actualizada' };
  }

  // El registro público de clientes está deshabilitado (no hay pantalla ni
  // uso para esas cuentas todavía): evita altas masivas. AuthService.register
  // se conserva para reactivarlo exponiendo de nuevo POST /auth/register.

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // mitiga fuerza bruta
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  // No requiere estar autenticado con el access token — el refresh token
  // en sí mismo es prueba suficiente de identidad para cerrar SU sesión.
  // Siempre responde 200, exista o no el token todavía (ver AuthService).
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
    return { mensaje: 'Sesión cerrada' };
  }
}
