import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { MaterialProveedorService } from './material-proveedor.service';
import { AsociarProveedorDto } from './dto/asociar-proveedor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../usuarios/entities/usuario.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
@Controller('api/v1/materiales/:id/proveedores')
export class MaterialProveedorController {
  constructor(private readonly materialProveedorService: MaterialProveedorService) {}

  @Post()
  asociar(
    @Param('id', ParseUUIDPipe) materialId: string,
    @Body() dto: AsociarProveedorDto,
  ) {
    return this.materialProveedorService.asociar(materialId, dto);
  }

  @Get()
  listar(@Param('id', ParseUUIDPipe) materialId: string) {
    return this.materialProveedorService.listarPorMaterial(materialId);
  }
}
