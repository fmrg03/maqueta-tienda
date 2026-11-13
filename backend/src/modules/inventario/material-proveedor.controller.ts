import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MaterialProveedorService } from './material-proveedor.service';
import { AsociarProveedorDto } from './dto/asociar-proveedor.dto';
import { ActualizarAsociacionDto, AsociarProductoDto } from './dto/proveedor-producto.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permisos } from '../../common/decorators/permisos.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Permisos('inventario.gestionar')
@ApiTags('Materiales-Proveedores')
@ApiBearerAuth('access-token')
@Controller('api/v1/variantes/:id/proveedores')
export class MaterialProveedorController {
  constructor(private readonly materialProveedorService: MaterialProveedorService) {}

  @Post()
  asociar(
    @Param('id', ParseUUIDPipe) varianteId: string,
    @Body() dto: AsociarProveedorDto,
  ) {
    return this.materialProveedorService.asociar(varianteId, dto);
  }

  @Get()
  @Permisos('inventario.ver')
  listar(@Param('id', ParseUUIDPipe) varianteId: string) {
    return this.materialProveedorService.listarPorVariante(varianteId);
  }
}

/** Lo mismo, visto desde el proveedor (lo que usa el panel). */
@UseGuards(JwtAuthGuard, RolesGuard)
@Permisos('inventario.gestionar')
@ApiTags('Materiales-Proveedores')
@ApiBearerAuth('access-token')
@Controller('api/v1')
export class ProveedorProductosController {
  constructor(private readonly service: MaterialProveedorService) {}

  @Get('proveedores/:id/productos')
  @Permisos('inventario.ver')
  listar(@Param('id', ParseUUIDPipe) proveedorId: string) {
    return this.service.listarPorProveedor(proveedorId);
  }

  @Post('proveedores/:id/productos')
  agregar(@Param('id', ParseUUIDPipe) proveedorId: string, @Body() dto: AsociarProductoDto) {
    return this.service.asociar(dto.varianteId, {
      proveedorId,
      precioCostoProveedor: dto.precioCostoProveedor,
      tiempoEntregaDias: dto.tiempoEntregaDias,
    });
  }

  @Patch('proveedor-productos/:id')
  actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarAsociacionDto) {
    return this.service.actualizar(id, dto);
  }

  @Delete('proveedor-productos/:id')
  eliminar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.eliminar(id);
  }
}
