import { BadRequestException, Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportesService } from './reportes.service';
import { construirLibro, SECCIONES, SeccionReporte } from './reportes-excel';
import { ReporteQueryDto } from './dto/reporte-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../usuarios/entities/usuario.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
@ApiTags('Reportes')
@ApiBearerAuth('access-token')
@Controller('api/v1/reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('inventario')
  reporteInventario(@Query() query: ReporteQueryDto) {
    return this.reportesService.reporteInventario(query);
  }

  @Get('ganancias')
  reporteGanancias(@Query() query: ReporteQueryDto) {
    return this.reportesService.reporteGanancias(query.desde, query.hasta, query.agrupacion);
  }

  @Get('ventas')
  ventas(@Query() q: ReporteQueryDto) {
    return this.reportesService.reporteVentas(q.desde, q.hasta);
  }

  @Get('compras')
  compras(@Query() q: ReporteQueryDto) {
    return this.reportesService.reporteCompras(q.desde, q.hasta);
  }

  @Get('mas-vendidos')
  masVendidos(@Query() q: ReporteQueryDto) {
    return this.reportesService.reporteMasVendidos(q.desde, q.hasta);
  }

  @Get('asesorias')
  asesorias(@Query() q: ReporteQueryDto) {
    return this.reportesService.reporteAsesorias(q.desde, q.hasta);
  }

  @Get('stock')
  stock() {
    return this.reportesService.reporteStock();
  }

  @Get('exportar/:seccion')
  async exportar(@Param('seccion') seccion: string, @Query() q: ReporteQueryDto, @Res() res: Response) {
    if (!SECCIONES.includes(seccion as SeccionReporte)) throw new BadRequestException('Sección de reporte no válida');
    const libro = await construirLibro(seccion as SeccionReporte, this.reportesService, q.desde, q.hasta, q.agrupacion ?? 'mes');
    const dia = (x: string) => x.slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-${seccion}-${dia(q.desde)}_a_${dia(q.hasta)}.xlsx"`);
    await libro.xlsx.write(res);
    res.end();
  }
}
