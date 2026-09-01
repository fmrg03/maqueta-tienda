import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../usuarios/entities/usuario.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
@ApiTags('Proveedores')
@ApiBearerAuth('access-token')
@Controller('api/v1/proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Post()
  create(@Body() dto: CreateProveedorDto) {
    return this.proveedoresService.create(dto);
  }

  @Get()
  findAll() {
    return this.proveedoresService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.proveedoresService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProveedorDto,
  ) {
    return this.proveedoresService.update(id, dto);
  }

  @Delete(':id')
  desactivar(@Param('id', ParseUUIDPipe) id: string) {
    return this.proveedoresService.desactivar(id);
  }
}
