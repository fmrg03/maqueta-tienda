import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { CreateVarianteDto } from './dto/create-variante.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../usuarios/entities/usuario.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
@Controller('api/v1')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Post('materiales/:id/variantes')
  crearVariante(
    @Param('id', ParseUUIDPipe) materialId: string,
    @Body() dto: CreateVarianteDto,
  ) {
    return this.inventarioService.crearVariante(materialId, dto);
  }

  @Post('materiales/:id/movimientos')
  registrarMovimiento(
    @Param('id', ParseUUIDPipe) materialId: string,
    @Body() dto: RegistrarMovimientoDto,
    @Req() request: any,
  ) {
    // materialId de la ruta se usa para consistencia del contrato REST;
    // la variante ya trae su propio material asociado en el modelo.
    return this.inventarioService.registrarMovimiento(dto, request.user?.id);
  }

  @Get('movimientos')
  listarMovimientos(@Query('variante') varianteId?: string) {
    return this.inventarioService.listarMovimientos(varianteId);
  }
}
