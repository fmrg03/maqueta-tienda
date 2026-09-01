import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CombosService } from './combos.service';
import { CreateComboDto } from './dto/create-combo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../usuarios/entities/usuario.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
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
  findAll() {
    return this.combosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.combosService.findOne(id);
  }
}
