import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CombosService, type FiltroEstadoCombo } from './combos.service';
import { CreateComboDto } from './dto/create-combo.dto';
import { UpdateComboDto } from './dto/update-combo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permisos } from '../../common/decorators/permisos.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Permisos('inventario.gestionar')
@ApiTags('Combos')
@ApiBearerAuth('access-token')
@Controller('api/v1/combos')
export class CombosController {
  constructor(private readonly combosService: CombosService) {}

  @Post()
  create(@Body() dto: CreateComboDto) {
    return this.combosService.create(dto);
  }

  @Get()
  @Permisos('inventario.ver')
  findAll(@Query('estado') estado?: FiltroEstadoCombo) {
    return this.combosService.findAll(
      estado === 'inactivos' || estado === 'todos' ? estado : 'activos',
    );
  }

  @Get(':id')
  @Permisos('inventario.ver')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.combosService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateComboDto) {
    return this.combosService.update(id, dto);
  }
}
