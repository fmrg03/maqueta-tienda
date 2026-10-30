import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from '../inventario/entities/material.entity';
import { Combo } from '../inventario/entities/combo.entity';
import { Categoria } from '../inventario/entities/categoria.entity';
import { VarianteMaterial } from '../inventario/entities/variante-material.entity';

// Lo que el público puede ver de una variante: NUNCA el costo (precioCosto)
// — es información interna del negocio (con el costo y el precio de venta
// cualquiera calcularía el margen). Detectado al revisar la respuesta real
// del catálogo público, no estaba cubierto por el pentest.
export type VariantePublica = Omit<VarianteMaterial, 'precioCosto'>;
export type MaterialPublico = Omit<Material, 'variantes'> & {
  variantes: VariantePublica[];
};
export type ComboPublico = Omit<Combo, 'items'> & {
  items: Array<Omit<Combo['items'][number], 'variante'> & { variante: VariantePublica }>;
};

function sinCosto(variante: VarianteMaterial): VariantePublica {
  const { precioCosto: _costo, ...publica } = variante;
  return publica;
}

function materialPublico(material: Material): MaterialPublico {
  return {
    ...material,
    variantes: (material.variantes ?? []).map(sinCosto),
  };
}

function comboPublico(combo: Combo): ComboPublico {
  return {
    ...combo,
    items: (combo.items ?? []).map((item) => ({
      ...item,
      variante: sinCosto(item.variante),
    })),
  };
}

export interface PaginacionResult<T> {
  items: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

@Injectable()
export class CatalogoService {
  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(Combo)
    private readonly comboRepository: Repository<Combo>,
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
  ) {}

  async listarMateriales(
    pagina = 1,
    porPagina = 20,
    categoriaId?: string,
  ): Promise<PaginacionResult<MaterialPublico>> {
    // Valores sanos: entero >= 1 y tope de 100 por página (endpoint público).
    pagina = Number.isInteger(pagina) && pagina >= 1 ? pagina : 1;
    porPagina = Number.isInteger(porPagina) && porPagina >= 1 ? Math.min(porPagina, 100) : 20;
    const [items, total] = await this.materialRepository.findAndCount({
      where: {
        activo: true,
        ...(categoriaId ? { categoria: { id: categoriaId } } : {}),
      },
      relations: ['categoria', 'variantes'],
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      order: { nombre: 'ASC' },
    });

    return { items: items.map(materialPublico), total, pagina, porPagina };
  }

  async obtenerMaterial(id: string): Promise<MaterialPublico> {
    const material = await this.materialRepository.findOne({
      where: { id, activo: true },
      relations: ['categoria', 'variantes'],
    });
    if (!material) {
      throw new NotFoundException(`Material ${id} no encontrado`);
    }
    return materialPublico(material);
  }

  async listarCombos(): Promise<ComboPublico[]> {
    const combos = await this.comboRepository.find({
      where: { activo: true },
      relations: ['items', 'items.variante', 'items.variante.material'],
    });
    return combos.map(comboPublico);
  }

  async listarCategorias(): Promise<Categoria[]> {
    return this.categoriaRepository.find({ order: { nombre: 'ASC' } });
  }
}
