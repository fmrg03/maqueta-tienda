import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { VarianteMaterial } from './entities/variante-material.entity';
import { Material } from './entities/material.entity';
import {
  MovimientoInventario,
  TipoMovimiento,
} from './entities/movimiento-inventario.entity';
import { CreateVarianteDto } from './dto/create-variante.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(VarianteMaterial)
    private readonly varianteRepository: Repository<VarianteMaterial>,
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(MovimientoInventario)
    private readonly movimientoRepository: Repository<MovimientoInventario>,
    private readonly dataSource: DataSource,
  ) {}

  async crearVariante(
    materialId: string,
    dto: CreateVarianteDto,
  ): Promise<VarianteMaterial> {
    const material = await this.materialRepository.findOne({
      where: { id: materialId },
    });
    if (!material) {
      throw new NotFoundException(`Material ${materialId} no encontrado`);
    }

    const skuEnUso = await this.varianteRepository.findOne({
      where: { skuVariante: dto.skuVariante },
    });
    if (skuEnUso) {
      throw new ConflictException(
        `Ya existe una variante con SKU ${dto.skuVariante}`,
      );
    }

    const variante = this.varianteRepository.create({
      material,
      skuVariante: dto.skuVariante,
      atributos: dto.atributos ?? {},
      stock: dto.stock ?? 0,
      precioVentaOverride: dto.precioVentaOverride,
    });

    return this.varianteRepository.save(variante);
  }

  /**
   * Registra un movimiento de inventario (entrada/salida) y actualiza el
   * stock de la variante dentro de una misma transacción con lock
   * pesimista, para evitar condiciones de carrera si dos movimientos
   * sobre la misma variante llegan casi simultáneamente (ej. dos ventas
   * concurrentes agotando el mismo stock).
   */
  async registrarMovimiento(
    dto: RegistrarMovimientoDto,
    usuarioId?: string,
  ): Promise<MovimientoInventario> {
    return this.dataSource.transaction(async (manager) => {
      const variante = await manager
        .getRepository(VarianteMaterial)
        .createQueryBuilder('variante')
        .setLock('pessimistic_write')
        .where('variante.id = :id', { id: dto.varianteId })
        .getOne();

      if (!variante) {
        throw new NotFoundException(`Variante ${dto.varianteId} no encontrada`);
      }

      if (dto.tipo === TipoMovimiento.SALIDA && variante.stock < dto.cantidad) {
        throw new BadRequestException(
          `Stock insuficiente: disponible ${variante.stock}, solicitado ${dto.cantidad}`,
        );
      }

      variante.stock =
        dto.tipo === TipoMovimiento.ENTRADA
          ? variante.stock + dto.cantidad
          : variante.stock - dto.cantidad;

      await manager.getRepository(VarianteMaterial).save(variante);

      const movimiento = manager.getRepository(MovimientoInventario).create({
        variante,
        tipo: dto.tipo,
        cantidad: dto.cantidad,
        motivo: dto.motivo,
        usuario: usuarioId ? ({ id: usuarioId } as any) : undefined,
      });

      return manager.getRepository(MovimientoInventario).save(movimiento);
    });
  }

  async listarMovimientos(varianteId?: string): Promise<MovimientoInventario[]> {
    const where = varianteId ? { variante: { id: varianteId } } : {};
    return this.movimientoRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }
}
