import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
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
    @Query('pagina') paginaRaw?: string,
    @Query('por_pagina') porPaginaRaw?: string,
  ) {
    // Parseo manual en vez de ParseIntPipe({ optional: true }): esa opción
    // no se comportó como está documentado cuando el query param está
    // ausente (se detectó probando la app real, no solo con tests).
    const pagina = paginaRaw ? parseInt(paginaRaw, 10) : undefined;
    const porPagina = porPaginaRaw ? parseInt(porPaginaRaw, 10) : undefined;
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
