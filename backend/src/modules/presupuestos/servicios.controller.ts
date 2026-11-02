import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ServiciosService } from './servicios.service';
import { CreateServicioDto, UpdateServicioDto } from './dto/servicio.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../usuarios/entities/usuario.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN, RolUsuario.VENTAS, RolUsuario.ASESOR)
@ApiTags('Servicios')
@ApiBearerAuth('access-token')
@Controller('api/v1/servicios')
export class ServiciosController {
  constructor(private readonly servicios: ServiciosService) {}

  @Get()
  listar(@Query('estado') estado?: string) {
    return this.servicios.listar(estado === 'inactivos' || estado === 'todos' ? estado : 'activos');
  }

  @Post()
  @Roles(RolUsuario.ADMIN)
  crear(@Body() dto: CreateServicioDto) {
    return this.servicios.crear(dto);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN)
  actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateServicioDto) {
    return this.servicios.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(RolUsuario.ADMIN)
  desactivar(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicios.desactivar(id);
  }
}
