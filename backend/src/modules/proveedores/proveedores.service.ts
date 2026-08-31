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

  async findAll(): Promise<Proveedor[]> {
    return this.proveedorRepository.find({ where: { activo: true } });
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
