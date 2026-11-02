import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PresupuestosService } from './presupuestos.service';
import { EstadoPresupuestoDto, GuardarPresupuestoDto } from './dto/guardar-presupuesto.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../usuarios/entities/usuario.entity';
import { ESTADOS_PRESUPUESTO } from './entities/presupuesto.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN, RolUsuario.VENTAS, RolUsuario.ASESOR)
@ApiTags('Presupuestos')
@ApiBearerAuth('access-token')
@Controller('api/v1/presupuestos')
export class PresupuestosController {
  constructor(private readonly presupuestos: PresupuestosService) {}

  @Get()
  listar(@Query('estado') estado?: string, @Query('buscar') buscar?: string) {
    const e = ESTADOS_PRESUPUESTO.find((x) => x === estado);
    return this.presupuestos.listar(e, buscar);
  }

  @Post()
  crear(@Body() dto: GuardarPresupuestoDto, @Req() req: any) {
    return this.presupuestos.crear(dto, req.user?.id);
  }

  @Get(':id')
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.presupuestos.obtener(id);
  }

  @Put(':id')
  actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GuardarPresupuestoDto) {
    return this.presupuestos.actualizar(id, dto);
  }

  @Patch(':id/estado')
  cambiarEstado(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EstadoPresupuestoDto) {
    return this.presupuestos.cambiarEstado(id, dto.estado);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(RolUsuario.ADMIN, RolUsuario.VENTAS)
  eliminar(@Param('id', ParseUUIDPipe) id: string) {
    return this.presupuestos.eliminar(id);
  }

  @Post(':id/enviar')
  enviar(@Param('id', ParseUUIDPipe) id: string) {
    return this.presupuestos.enviar(id);
  }

  // La solicitud de carrito solo la ven admin y ventas (RLS), por eso los asesores no convierten.
  @Post(':id/convertir')
  @Roles(RolUsuario.ADMIN, RolUsuario.VENTAS)
  convertir(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.presupuestos.convertir(id, req.user?.id);
  }

  @Get(':id/pdf')
  async pdf(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const { buffer, nombre } = await this.presupuestos.pdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);
  }
}

/** Enlace público (sin sesión) al PDF que se manda al cliente; el token es aleatorio e impredecible. */
@ApiTags('Presupuestos')
@Controller('api/v1/presupuesto-publico')
export class PresupuestoPublicoController {
  constructor(private readonly presupuestos: PresupuestosService) {}

  @Get(':token/pdf')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async pdf(@Param('token', ParseUUIDPipe) token: string, @Res() res: Response) {
    const { buffer, nombre } = await this.presupuestos.pdfPublico(token);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${nombre}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buffer);
  }
}
