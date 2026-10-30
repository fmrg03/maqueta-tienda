import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialProveedor } from './entities/material-proveedor.entity';
import { VarianteMaterial } from './entities/variante-material.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { AsociarProveedorDto } from './dto/asociar-proveedor.dto';
import { ActualizarAsociacionDto } from './dto/proveedor-producto.dto';

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

    const yaExiste = await this.materialProveedorRepository.findOne({
      where: { variante: { id: varianteId }, proveedor: { id: dto.proveedorId } },
    });
    if (yaExiste) {
      throw new ConflictException('Ese proveedor ya suministra esta presentación; edita su costo en vez de agregarla de nuevo');
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

  /** Lo que suministra un proveedor, con la presentación y su material. */
  async listarPorProveedor(proveedorId: string): Promise<MaterialProveedor[]> {
    return this.materialProveedorRepository.find({
      where: { proveedor: { id: proveedorId } },
      relations: ['variante', 'variante.material'],
      order: { id: 'ASC' },
    });
  }

  async actualizar(id: string, dto: ActualizarAsociacionDto): Promise<MaterialProveedor> {
    const asociacion = await this.materialProveedorRepository.findOne({ where: { id } });
    if (!asociacion) throw new NotFoundException(`Asociación ${id} no encontrada`);
    if (dto.precioCostoProveedor !== undefined) asociacion.precioCostoProveedor = dto.precioCostoProveedor;
    if (dto.tiempoEntregaDias !== undefined) asociacion.tiempoEntregaDias = dto.tiempoEntregaDias;
    return this.materialProveedorRepository.save(asociacion);
  }

  async eliminar(id: string): Promise<void> {
    const r = await this.materialProveedorRepository.delete({ id });
    if (!r.affected) throw new NotFoundException(`Asociación ${id} no encontrada`);
  }
}
