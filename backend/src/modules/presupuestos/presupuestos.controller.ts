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
import { Permisos } from '../../common/decorators/permisos.decorator';
import { ESTADOS_PRESUPUESTO } from './entities/presupuesto.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Permisos('presupuestos.ver')
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
  @Permisos('presupuestos.gestionar')
  crear(@Body() dto: GuardarPresupuestoDto, @Req() req: any) {
    return this.presupuestos.crear(dto, req.user?.id);
  }

  @Get(':id')
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.presupuestos.obtener(id);
  }

  @Put(':id')
  @Permisos('presupuestos.gestionar')
  actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GuardarPresupuestoDto) {
    return this.presupuestos.actualizar(id, dto);
  }

  @Patch(':id/estado')
  @Permisos('presupuestos.gestionar')
  cambiarEstado(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EstadoPresupuestoDto) {
    return this.presupuestos.cambiarEstado(id, dto.estado);
  }

  @Delete(':id')
  @HttpCode(204)
  @Permisos('presupuestos.eliminar')
  eliminar(@Param('id', ParseUUIDPipe) id: string) {
    return this.presupuestos.eliminar(id);
  }

  @Post(':id/enviar')
  @Permisos('presupuestos.gestionar')
  enviar(@Param('id', ParseUUIDPipe) id: string) {
    return this.presupuestos.enviar(id);
  }

  // Convertir crea una solicitud de carrito: requiere permiso de convertir.
  @Post(':id/convertir')
  @Permisos('presupuestos.convertir')
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
