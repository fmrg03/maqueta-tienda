import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CarritoService } from './carrito.service';
import { CreateSolicitudCarritoDto } from './dto/create-solicitud-carrito.dto';
import { EditarItemsCarritoDto } from './dto/editar-items-carrito.dto';
import { CancelarCarritoDto, CerrarCarritoDto } from './dto/cerrar-carrito.dto';
import { ActualizarEstadoCarritoDto } from './dto/actualizar-estado-carrito.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../usuarios/entities/usuario.entity';
import { PhoneRateLimitGuard } from '../../common/rate-limit/phone-rate-limit.guard';
import { CaptchaGuard } from '../../common/captcha/captcha.guard';

@ApiTags('Carrito')
@Controller('api/v1/carrito')
export class CarritoController {
  constructor(private readonly carritoService: CarritoService) {}

  // Público: el cliente arma su carrito en el catálogo y lo envía sin login.
  // Rate limiting por IP (@Throttle) + por teléfono (PhoneRateLimitGuard) +
  // captcha (CaptchaGuard, opt-in) — ver ARCHITECTURE.md sección Seguridad.
  @Post('solicitud')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(PhoneRateLimitGuard, CaptchaGuard)
  crearSolicitud(@Body() dto: CreateSolicitudCarritoDto) {
    return this.carritoService.crearSolicitud(dto);
  }

  @Get('solicitudes')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.VENTAS)
  findAll(@Query('estado') estado?: string) {
    return this.carritoService.findAll(estado);
  }

  @Get('solicitudes/:id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.VENTAS)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.carritoService.findOne(id);
  }

  @Patch('solicitudes/:id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.VENTAS)
  actualizarEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarEstadoCarritoDto,
    @Req() request: any,
  ) {
    return this.carritoService.actualizarEstado(id, dto, request.user?.id);
  }

  @Get('solicitudes/:id/historial')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.VENTAS)
  historial(@Param('id', ParseUUIDPipe) id: string) {
    return this.carritoService.historial(id);
  }

  @Put('solicitudes/:id/items')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.VENTAS)
  editarItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditarItemsCarritoDto,
    @Req() request: any,
  ) {
    return this.carritoService.editarItems(id, dto, request.user?.id);
  }

  @Post('solicitudes/:id/enviar-detalle')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.VENTAS)
  enviarDetalle(@Param('id', ParseUUIDPipe) id: string, @Req() request: any) {
    return this.carritoService.enviarDetalle(id, request.user?.id);
  }

  @Post('solicitudes/:id/cerrar')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.VENTAS)
  cerrar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CerrarCarritoDto,
    @Req() request: any,
  ) {
    return this.carritoService.cerrar(id, dto, request.user?.id);
  }

  @Post('solicitudes/:id/cancelar')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.VENTAS)
  cancelar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelarCarritoDto,
    @Req() request: any,
  ) {
    return this.carritoService.cancelar(id, dto, request.user);
  }
}
