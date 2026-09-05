import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Combo, ComboItem } from './entities/combo.entity';
import { VarianteMaterial } from './entities/variante-material.entity';
import { CreateComboDto } from './dto/create-combo.dto';

@Injectable()
export class CombosService {
  constructor(
    @InjectRepository(Combo)
    private readonly comboRepository: Repository<Combo>,
    @InjectRepository(VarianteMaterial)
    private readonly varianteRepository: Repository<VarianteMaterial>,
  ) {}

  async create(dto: CreateComboDto): Promise<Combo> {
    const items: ComboItem[] = [];

    for (const itemDto of dto.items) {
      const variante = await this.varianteRepository.findOne({
        where: { id: itemDto.varianteId },
      });
      if (!variante) {
        throw new NotFoundException(`Variante ${itemDto.varianteId} no encontrada`);
      }

      const item = new ComboItem();
      item.cantidad = itemDto.cantidad;
      item.variante = variante;
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
      relations: ['items', 'items.variante'],
    });
  }

  async findOne(id: string): Promise<Combo> {
    const combo = await this.comboRepository.findOne({
      where: { id },
      relations: ['items', 'items.variante'],
    });
    if (!combo) {
      throw new NotFoundException(`Combo ${id} no encontrado`);
    }
    return combo;
  }
}
