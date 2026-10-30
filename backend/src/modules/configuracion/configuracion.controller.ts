import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfiguracionService } from './configuracion.service';
import { FijarDescuentoDto } from './dto/fijar-descuento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../usuarios/entities/usuario.entity';

@ApiTags('Configuración')
@Controller('api/v1/configuracion')
export class ConfiguracionController {
  constructor(private readonly configuracion: ConfiguracionService) {}

  // Público: la web puede anunciar "X% de descuento pagando en divisas".
  @Get('publica')
  async publica() {
    return { descuentoDivisasPct: await this.configuracion.descuentoDivisasPct() };
  }

  @Put('descuento-divisas')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  async fijarDescuento(@Body() dto: FijarDescuentoDto, @Req() request: any) {
    const porcentaje = await this.configuracion.fijarDescuentoDivisas(dto.porcentaje, request.user?.id);
    return { descuentoDivisasPct: porcentaje };
  }
}
