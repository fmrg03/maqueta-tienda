import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from '../inventario/entities/material.entity';
import { Combo } from '../inventario/entities/combo.entity';
import { Categoria } from '../inventario/entities/categoria.entity';

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
  ): Promise<PaginacionResult<Material>> {
    const [items, total] = await this.materialRepository.findAndCount({
      where: { activo: true },
      relations: ['categoria', 'variantes'],
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      order: { nombre: 'ASC' },
    });

    return { items, total, pagina, porPagina };
  }

  async obtenerMaterial(id: string): Promise<Material> {
    const material = await this.materialRepository.findOne({
      where: { id, activo: true },
      relations: ['categoria', 'variantes'],
    });
    if (!material) {
      throw new NotFoundException(`Material ${id} no encontrado`);
    }
    return material;
  }

  async listarCombos(): Promise<Combo[]> {
    return this.comboRepository.find({
      where: { activo: true },
      relations: ['items', 'items.material', 'items.variante'],
    });
  }

  async listarCategorias(): Promise<Categoria[]> {
    return this.categoriaRepository.find({ order: { nombre: 'ASC' } });
  }
}
