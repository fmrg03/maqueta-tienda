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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AsesoriasService } from './asesorias.service';
import { CrearSolicitudAsesoriaDto } from './dto/crear-solicitud-asesoria.dto';
import { RegistrarLlamadaDto } from './dto/registrar-llamada.dto';
import { EstadoSolicitudAsesoria } from './entities/asesoria.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../usuarios/entities/usuario.entity';

@ApiTags('Asesorias')
@Controller('api/v1/asesorias')
export class AsesoriasController {
  constructor(private readonly asesoriasService: AsesoriasService) {}

  // Público: el cliente elige franja + datos de contacto, sin login.
  @Post('solicitud')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  crearSolicitud(@Body() dto: CrearSolicitudAsesoriaDto) {
    return this.asesoriasService.crearSolicitud(dto);
  }

  @Get('solicitudes')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.ASESOR)
  findAll(@Query('estado') estado?: EstadoSolicitudAsesoria) {
    return this.asesoriasService.findAll(estado);
  }

  @Get('solicitudes/:id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.ASESOR)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.asesoriasService.findOne(id);
  }

  @Patch('solicitudes/:id/registrar-llamada')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.ASESOR)
  registrarLlamada(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegistrarLlamadaDto,
  ) {
    return this.asesoriasService.registrarLlamada(id, dto);
  }

  @Patch('solicitudes/:id/marcar-visita-pactada')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.ASESOR)
  marcarVisitaPactada(@Param('id', ParseUUIDPipe) id: string) {
    return this.asesoriasService.marcarVisitaPactada(id);
  }

  @Patch('solicitudes/:id/marcar-no-procede')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.ASESOR)
  marcarNoProcede(@Param('id', ParseUUIDPipe) id: string) {
    return this.asesoriasService.marcarNoProcede(id);
  }

  @Patch('solicitudes/:id/cancelar')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.ASESOR)
  cancelar(@Param('id', ParseUUIDPipe) id: string) {
    return this.asesoriasService.cancelar(id);
  }
}
