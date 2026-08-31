import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from './entities/material.entity';
import { Categoria } from './entities/categoria.entity';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

@Injectable()
export class MaterialesService {
  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
  ) {}

  async create(dto: CreateMaterialDto): Promise<Material> {
    const existente = await this.materialRepository.findOne({
      where: { sku: dto.sku },
    });
    if (existente) {
      throw new ConflictException(`Ya existe un material con SKU ${dto.sku}`);
    }

    const material = this.materialRepository.create({
      sku: dto.sku,
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      precioCosto: dto.precioCosto,
      precioVenta: dto.precioVenta,
      imagenUrl: dto.imagenUrl,
      activo: dto.activo ?? true,
    });

    if (dto.categoriaId) {
      material.categoria = await this.obtenerCategoria(dto.categoriaId);
    }

    return this.materialRepository.save(material);
  }

  async findAll(filtros?: { categoriaId?: string; stockBajo?: boolean }): Promise<Material[]> {
    const query = this.materialRepository
      .createQueryBuilder('material')
      .leftJoinAndSelect('material.categoria', 'categoria')
      .leftJoinAndSelect('material.variantes', 'variantes')
      .where('material.activo = true');

    if (filtros?.categoriaId) {
      query.andWhere('categoria.id = :categoriaId', {
        categoriaId: filtros.categoriaId,
      });
    }

    const materiales = await query.getMany();

    if (filtros?.stockBajo) {
      const UMBRAL_STOCK_BAJO = 10;
      return materiales.filter((m) =>
        m.variantes?.some((v) => v.stock <= UMBRAL_STOCK_BAJO),
      );
    }

    return materiales;
  }

  async findOne(id: string): Promise<Material> {
    const material = await this.materialRepository.findOne({
      where: { id },
      relations: ['categoria', 'variantes'],
    });
    if (!material) {
      throw new NotFoundException(`Material ${id} no encontrado`);
    }
    return material;
  }

  async update(id: string, dto: UpdateMaterialDto): Promise<Material> {
    const material = await this.findOne(id);

    if (dto.sku && dto.sku !== material.sku) {
      const skuEnUso = await this.materialRepository.findOne({
        where: { sku: dto.sku },
      });
      if (skuEnUso) {
        throw new ConflictException(`Ya existe un material con SKU ${dto.sku}`);
      }
    }

    const { categoriaId, ...resto } = dto;
    Object.assign(material, resto);

    if (categoriaId) {
      material.categoria = await this.obtenerCategoria(categoriaId);
    }

    return this.materialRepository.save(material);
  }

  private async obtenerCategoria(categoriaId: string): Promise<Categoria> {
    const categoria = await this.categoriaRepository.findOne({
      where: { id: categoriaId },
    });
    if (!categoria) {
      throw new NotFoundException(`Categoría ${categoriaId} no encontrada`);
    }
    return categoria;
  }
}
