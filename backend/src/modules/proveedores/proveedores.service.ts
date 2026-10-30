import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedor } from './entities/proveedor.entity';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedor)
    private readonly proveedorRepository: Repository<Proveedor>,
  ) {}

  async create(dto: CreateProveedorDto): Promise<Proveedor> {
    const proveedor = this.proveedorRepository.create(dto);
    return this.proveedorRepository.save(proveedor);
  }

  /** Con la cantidad de presentaciones que suministra cada uno. */
  async findAll(
    estado: 'activos' | 'inactivos' | 'todos' = 'activos',
  ): Promise<Array<Proveedor & { productos: number }>> {
    const where = estado === 'todos' ? {} : { activo: estado === 'activos' };
    const proveedores = await this.proveedorRepository.find({ where, order: { nombre: 'ASC' } });
    const conteos: Array<{ id: string; n: number }> = await this.proveedorRepository.manager.query(
      `SELECT "proveedorId" AS id, count(*)::int AS n FROM material_proveedor GROUP BY "proveedorId"`,
    );
    const porId = new Map(conteos.map((c) => [c.id, c.n]));
    return proveedores.map((p) => Object.assign(p, { productos: porId.get(p.id) ?? 0 }));
  }

  async findOne(id: string): Promise<Proveedor> {
    const proveedor = await this.proveedorRepository.findOne({
      where: { id },
    });
    if (!proveedor) {
      throw new NotFoundException(`Proveedor ${id} no encontrado`);
    }
    return proveedor;
  }

  async update(id: string, dto: UpdateProveedorDto): Promise<Proveedor> {
    const proveedor = await this.findOne(id);
    Object.assign(proveedor, dto);
    return this.proveedorRepository.save(proveedor);
  }

  async desactivar(id: string): Promise<void> {
    const proveedor = await this.findOne(id);
    proveedor.activo = false;
    await this.proveedorRepository.save(proveedor);
  }
}
