import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesService } from './roles.service';
import { ActualizarRolDto, CrearRolDto } from './dto/rol.dto';
import { CATALOGO_PERMISOS, ROL_ADMIN } from './permisos';

/** Solo el administrador crea y edita roles y permisos. */
@Controller('api/v1/roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROL_ADMIN)
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  async listar() {
    return { roles: await this.roles.listar(), catalogo: CATALOGO_PERMISOS };
  }

  @Post()
  crear(@Body() dto: CrearRolDto) {
    return this.roles.crear(dto);
  }

  @Patch(':id')
  actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarRolDto) {
    return this.roles.actualizar(id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseUUIDPipe) id: string) {
    return this.roles.eliminar(id);
  }
}
