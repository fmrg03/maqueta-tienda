import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AsesoresService } from './asesores.service';
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
  crearAsesor(@Body() body: { usuarioId: string; especialidad?: string }) {
    return this.asesoresService.crearAsesor(body.usuarioId, body.especialidad);
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
