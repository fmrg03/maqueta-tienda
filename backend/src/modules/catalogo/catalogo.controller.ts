import { Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CatalogoService } from './catalogo.service';

// Endpoints públicos: sin JwtAuthGuard. El rate limiting global
// (ThrottlerGuard en app.module.ts) sigue aplicando.
@ApiTags('Catalogo')
@Controller('api/v1/catalogo')
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Get('materiales')
  listarMateriales(
    @Query('pagina', new ParseIntPipe({ optional: true })) pagina?: number,
    @Query('por_pagina', new ParseIntPipe({ optional: true })) porPagina?: number,
  ) {
    return this.catalogoService.listarMateriales(pagina, porPagina);
  }

  @Get('materiales/:id')
  obtenerMaterial(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogoService.obtenerMaterial(id);
  }

  @Get('combos')
  listarCombos() {
    return this.catalogoService.listarCombos();
  }

  @Get('categorias')
  listarCategorias() {
    return this.catalogoService.listarCategorias();
  }
}
