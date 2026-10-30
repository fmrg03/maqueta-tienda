import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AsesoresService } from './asesores.service';
import { ActualizarAsesorDto } from './dto/actualizar-asesor.dto';
import { CrearAsesorDto } from './dto/crear-asesor.dto';
import { DisponibilidadLoteDto } from './dto/disponibilidad-lote.dto';
import { CrearDisponibilidadDto } from './dto/crear-disponibilidad.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../usuarios/entities/usuario.entity';

@ApiTags('Asesores')
@Controller('api/v1/asesores')
export class AsesoresController {
  constructor(private readonly asesoresService: AsesoresService) {}

  @Post()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  crearAsesor(@Body() dto: CrearAsesorDto) {
    return this.asesoresService.crearAsesor(dto);
  }

  // OJO: las rutas fijas (admin, disponibilidad/:id) van antes que ':id'.
  @Get('admin')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  listarAdmin(@Query('estado') estado?: string) {
    return this.asesoresService.listarAdmin(
      estado === 'inactivos' || estado === 'todos' ? estado : 'activos',
    );
  }

  @Delete('disponibilidad/:franjaId')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  eliminarFranja(@Param('franjaId', ParseUUIDPipe) franjaId: string) {
    return this.asesoresService.eliminarFranja(franjaId);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarAsesorDto) {
    return this.asesoresService.actualizar(id, dto);
  }

  @Get(':id/agenda')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  agenda(@Param('id', ParseUUIDPipe) id: string) {
    return this.asesoresService.agenda(id);
  }

  @Post(':id/disponibilidad/lote')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  agregarLote(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DisponibilidadLoteDto) {
    return this.asesoresService.agregarDisponibilidadLote(id, dto);
  }

  @Post(':id/disponibilidad')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  agregarDisponibilidad(
    @Param('id', ParseUUIDPipe) asesorId: string,
    @Body() dto: CrearDisponibilidadDto,
  ) {
    return this.asesoresService.agregarDisponibilidad(asesorId, dto);
  }

  // Público: el cliente elige asesor sin login. Solo id, nombre y especialidad.
  @Get()
  listarPublicos() {
    return this.asesoresService.listarPublicos();
  }

  // Público: el cliente necesita ver franjas libres para elegir, sin login.
  @Get(':id/disponibilidad')
  disponibilidad(
    @Param('id', ParseUUIDPipe) asesorId: string,
    @Query('fecha') fecha?: string,
  ) {
    const desde = fecha ? new Date(fecha) : new Date();
    return this.asesoresService.disponibilidadLibre(asesorId, desde);
  }
}
