import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CarritoService } from './carrito.service';
import { CreateSolicitudCarritoDto } from './dto/create-solicitud-carrito.dto';
import { ActualizarEstadoCarritoDto } from './dto/actualizar-estado-carrito.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../usuarios/entities/usuario.entity';

@Controller('api/v1/carrito')
export class CarritoController {
  constructor(private readonly carritoService: CarritoService) {}

  // Público: el cliente arma su carrito en el catálogo y lo envía sin login.
  // Rate limiting propio, más estricto que el default global, para mitigar
  // spam (ver ARCHITECTURE.md, sección Seguridad).
  @Post('solicitud')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  crearSolicitud(@Body() dto: CreateSolicitudCarritoDto) {
    return this.carritoService.crearSolicitud(dto);
  }

  @Get('solicitudes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.VENTAS)
  findAll(@Query('estado') estado?: string) {
    return this.carritoService.findAll(estado);
  }

  @Get('solicitudes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.VENTAS)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.carritoService.findOne(id);
  }

  @Patch('solicitudes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.VENTAS)
  actualizarEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarEstadoCarritoDto,
  ) {
    return this.carritoService.actualizarEstado(id, dto);
  }
}
