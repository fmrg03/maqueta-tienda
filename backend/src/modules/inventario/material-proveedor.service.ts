import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialProveedor } from './entities/material-proveedor.entity';
import { VarianteMaterial } from './entities/variante-material.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { AsociarProveedorDto } from './dto/asociar-proveedor.dto';

@Injectable()
export class MaterialProveedorService {
  constructor(
    @InjectRepository(MaterialProveedor)
    private readonly materialProveedorRepository: Repository<MaterialProveedor>,
    @InjectRepository(VarianteMaterial)
    private readonly varianteRepository: Repository<VarianteMaterial>,
    @InjectRepository(Proveedor)
    private readonly proveedorRepository: Repository<Proveedor>,
  ) {}

  async asociar(
    varianteId: string,
    dto: AsociarProveedorDto,
  ): Promise<MaterialProveedor> {
    const variante = await this.varianteRepository.findOne({
      where: { id: varianteId },
    });
    if (!variante) {
      throw new NotFoundException(`Variante ${varianteId} no encontrada`);
    }

    const proveedor = await this.proveedorRepository.findOne({
      where: { id: dto.proveedorId },
    });
    if (!proveedor) {
      throw new NotFoundException(`Proveedor ${dto.proveedorId} no encontrado`);
    }

    const asociacion = this.materialProveedorRepository.create({
      variante,
      proveedor,
      precioCostoProveedor: dto.precioCostoProveedor,
      tiempoEntregaDias: dto.tiempoEntregaDias,
    });

    return this.materialProveedorRepository.save(asociacion);
  }

  async listarPorVariante(varianteId: string): Promise<MaterialProveedor[]> {
    return this.materialProveedorRepository.find({
      where: { variante: { id: varianteId } },
    });
  }
}
