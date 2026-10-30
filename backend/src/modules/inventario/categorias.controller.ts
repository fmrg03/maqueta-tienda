import { Body, Controller, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CategoriasService } from './categorias.service';
import { CategoriaDto } from './dto/categoria.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../usuarios/entities/usuario.entity';

// La lectura es pública (GET /catalogo/categorias); acá solo el alta y el renombre.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
@ApiTags('Categorías')
@ApiBearerAuth('access-token')
@Controller('api/v1/categorias')
export class CategoriasController {
  constructor(private readonly categorias: CategoriasService) {}

  @Post()
  crear(@Body() dto: CategoriaDto) {
    return this.categorias.crear(dto);
  }

  @Patch(':id')
  renombrar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CategoriaDto) {
    return this.categorias.renombrar(id, dto);
  }
}
