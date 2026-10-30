import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Combo, ComboItem } from './entities/combo.entity';
import { VarianteMaterial } from './entities/variante-material.entity';
import { ComboItemInputDto, CreateComboDto } from './dto/create-combo.dto';
import { UpdateComboDto } from './dto/update-combo.dto';

export type FiltroEstadoCombo = 'activos' | 'inactivos' | 'todos';

const RELACIONES = ['items', 'items.variante', 'items.variante.material'];

@Injectable()
export class CombosService {
  constructor(
    @InjectRepository(Combo)
    private readonly comboRepository: Repository<Combo>,
    @InjectRepository(VarianteMaterial)
    private readonly varianteRepository: Repository<VarianteMaterial>,
  ) {}

  /** Valida que no haya variantes repetidas ni inexistentes y arma los ítems. */
  private async armarItems(entradas: ComboItemInputDto[]): Promise<ComboItem[]> {
    const ids = entradas.map((i) => i.varianteId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Una misma presentación no puede aparecer dos veces en el combo; suma las cantidades');
    }
    const variantes = await this.varianteRepository.find({ where: { id: In(ids) } });
    const porId = new Map(variantes.map((v) => [v.id, v]));
    return entradas.map((e) => {
      const variante = porId.get(e.varianteId);
      if (!variante) throw new NotFoundException(`Variante ${e.varianteId} no encontrada`);
      const item = new ComboItem();
      item.cantidad = e.cantidad;
      item.variante = variante;
      return item;
    });
  }

  async create(dto: CreateComboDto): Promise<Combo> {
    const items = await this.armarItems(dto.items);
    const combo = this.comboRepository.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      precioCombo: dto.precioCombo,
      items,
    });
    const guardado = await this.comboRepository.save(combo);
    return this.findOne(guardado.id);
  }

  async findAll(estado: FiltroEstadoCombo = 'activos'): Promise<Combo[]> {
    const where = estado === 'todos' ? {} : { activo: estado === 'activos' };
    return this.comboRepository.find({
      where,
      relations: RELACIONES,
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Combo> {
    const combo = await this.comboRepository.findOne({ where: { id }, relations: RELACIONES });
    if (!combo) {
      throw new NotFoundException(`Combo ${id} no encontrado`);
    }
    return combo;
  }

  /** Edita datos y, si vienen `items`, los reemplaza por completo (en una transacción). */
  async update(id: string, dto: UpdateComboDto): Promise<Combo> {
    const combo = await this.findOne(id);
    const nuevosItems = dto.items ? await this.armarItems(dto.items) : null;

    await this.comboRepository.manager.transaction(async (manager) => {
      if (dto.nombre !== undefined) combo.nombre = dto.nombre;
      if (dto.descripcion !== undefined) combo.descripcion = dto.descripcion;
      if (dto.precioCombo !== undefined) combo.precioCombo = dto.precioCombo;
      if (dto.activo !== undefined) combo.activo = dto.activo;
      if (nuevosItems) {
        await manager.delete(ComboItem, { combo: { id } });
        for (const item of nuevosItems) item.combo = { id } as Combo;
        await manager.save(ComboItem, nuevosItems);
      }
      const { items: _omitidos, ...datos } = combo;
      void _omitidos;
      await manager.save(Combo, datos as Combo);
    });
    return this.findOne(id);
  }
}
