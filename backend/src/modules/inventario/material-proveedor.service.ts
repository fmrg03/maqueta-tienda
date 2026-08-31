import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialProveedor } from './entities/material-proveedor.entity';
import { Material } from './entities/material.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { AsociarProveedorDto } from './dto/asociar-proveedor.dto';

@Injectable()
export class MaterialProveedorService {
  constructor(
    @InjectRepository(MaterialProveedor)
    private readonly materialProveedorRepository: Repository<MaterialProveedor>,
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(Proveedor)
    private readonly proveedorRepository: Repository<Proveedor>,
  ) {}

  async asociar(
    materialId: string,
    dto: AsociarProveedorDto,
  ): Promise<MaterialProveedor> {
    const material = await this.materialRepository.findOne({
      where: { id: materialId },
    });
    if (!material) {
      throw new NotFoundException(`Material ${materialId} no encontrado`);
    }

    const proveedor = await this.proveedorRepository.findOne({
      where: { id: dto.proveedorId },
    });
    if (!proveedor) {
      throw new NotFoundException(`Proveedor ${dto.proveedorId} no encontrado`);
    }

    const asociacion = this.materialProveedorRepository.create({
      material,
      proveedor,
      precioCostoProveedor: dto.precioCostoProveedor,
      tiempoEntregaDias: dto.tiempoEntregaDias,
    });

    return this.materialProveedorRepository.save(asociacion);
  }

  async listarPorMaterial(materialId: string): Promise<MaterialProveedor[]> {
    return this.materialProveedorRepository.find({
      where: { material: { id: materialId } },
    });
  }
}
