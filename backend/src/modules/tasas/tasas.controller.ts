import { Body, Controller, Get, NotFoundException, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TasasService } from './tasas.service';
import { FijarTasaDto } from './dto/fijar-tasa.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../usuarios/entities/usuario.entity';

@ApiTags('Tasas')
@Controller('api/v1/tasas')
export class TasasController {
  constructor(private readonly tasas: TasasService) {}

  // Público: el catálogo muestra precios en bolívares.
  @Get('bcv')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async bcv() {
    const t = await this.tasas.vigente();
    if (!t) throw new NotFoundException('Tasa BCV no disponible');
    return t;
  }

  @Get('historial')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  historial() {
    return this.tasas.historial();
  }

  @Post('actualizar')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  async actualizar() {
    await this.tasas.refrescar();
    return this.tasas.vigente();
  }

  @Post('manual')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  fijarManual(@Body() dto: FijarTasaDto, @Req() request: any) {
    return this.tasas.fijarManual(dto.valor, request.user?.id);
  }
}
