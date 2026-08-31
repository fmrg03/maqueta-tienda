import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Combo, ComboItem } from './entities/combo.entity';
import { Material } from './entities/material.entity';
import { VarianteMaterial } from './entities/variante-material.entity';
import { CreateComboDto } from './dto/create-combo.dto';

@Injectable()
export class CombosService {
  constructor(
    @InjectRepository(Combo)
    private readonly comboRepository: Repository<Combo>,
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(VarianteMaterial)
    private readonly varianteRepository: Repository<VarianteMaterial>,
  ) {}

  async create(dto: CreateComboDto): Promise<Combo> {
    const items: ComboItem[] = [];

    for (const itemDto of dto.items) {
      const tieneMaterial = Boolean(itemDto.materialId);
      const tieneVariante = Boolean(itemDto.varianteId);

      if (tieneMaterial === tieneVariante) {
        throw new BadRequestException(
          'Cada item del combo debe referenciar exactamente un materialId o un varianteId, no ambos ni ninguno',
        );
      }

      const item = new ComboItem();
      item.cantidad = itemDto.cantidad;

      if (tieneMaterial) {
        const material = await this.materialRepository.findOne({
          where: { id: itemDto.materialId },
        });
        if (!material) {
          throw new NotFoundException(`Material ${itemDto.materialId} no encontrado`);
        }
        item.material = material;
      } else {
        const variante = await this.varianteRepository.findOne({
          where: { id: itemDto.varianteId },
        });
        if (!variante) {
          throw new NotFoundException(`Variante ${itemDto.varianteId} no encontrada`);
        }
        item.variante = variante;
      }

      items.push(item);
    }

    const combo = this.comboRepository.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      precioCombo: dto.precioCombo,
      items,
    });

    return this.comboRepository.save(combo);
  }

  async findAll(): Promise<Combo[]> {
    return this.comboRepository.find({
      where: { activo: true },
      relations: ['items', 'items.material', 'items.variante'],
    });
  }

  async findOne(id: string): Promise<Combo> {
    const combo = await this.comboRepository.findOne({
      where: { id },
      relations: ['items', 'items.material', 'items.variante'],
    });
    if (!combo) {
      throw new NotFoundException(`Combo ${id} no encontrado`);
    }
    return combo;
  }
}
