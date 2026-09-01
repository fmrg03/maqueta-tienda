import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportesService } from './reportes.service';
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
  reporteGanancias(@Query('desde') desde: string, @Query('hasta') hasta: string) {
    return this.reportesService.reporteGanancias(desde, hasta);
  }
}
