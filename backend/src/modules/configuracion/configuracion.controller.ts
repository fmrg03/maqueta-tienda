import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfiguracionService } from './configuracion.service';
import { FijarReservaDto } from './dto/fijar-reserva.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permisos } from '../../common/decorators/permisos.decorator';

@ApiTags('Configuración')
@Controller('api/v1/configuracion')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConfiguracionController {
  constructor(private readonly configuracion: ConfiguracionService) {}

  @Get('reserva')
  @Permisos('configuracion.ver')
  async reserva() {
    return { dias: await this.configuracion.reservaDias() };
  }

  @Put('reserva')
  @Permisos('configuracion.gestionar')
  async fijarReserva(@Body() dto: FijarReservaDto, @Req() request: any) {
    return { dias: await this.configuracion.fijarReservaDias(dto.dias, request.user?.id) };
  }
}
