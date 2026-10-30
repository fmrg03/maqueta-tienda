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
import { UpdateVarianteDto } from './dto/update-variante.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { ConsultaMovimientosDto } from './dto/consulta-movimientos.dto';
import { getRlsManager } from '../../common/rls/request-context';

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
    usuarioId?: string,
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
      // El stock inicial entra como un movimiento (queda en el kardex), no
      // como un número escrito a mano en la variante.
      stock: 0,
      precioVenta: dto.precioVenta,
      precioCosto: dto.precioCosto,
    });

    const guardada = await this.varianteRepository.save(variante);

    if (dto.stock && dto.stock > 0) {
      await this.registrarMovimiento(
        {
          varianteId: guardada.id,
          tipo: TipoMovimiento.ENTRADA,
          cantidad: dto.stock,
          motivo: 'Stock inicial',
        },
        usuarioId,
      );
      guardada.stock = dto.stock;
    }

    return guardada;
  }

  async actualizarVariante(
    id: string,
    dto: UpdateVarianteDto,
  ): Promise<VarianteMaterial> {
    const variante = await this.varianteRepository.findOne({
      where: { id },
      relations: ['material'],
    });
    if (!variante) {
      throw new NotFoundException(`Variante ${id} no encontrada`);
    }

    if (dto.skuVariante && dto.skuVariante !== variante.skuVariante) {
      const skuEnUso = await this.varianteRepository.findOne({
        where: { skuVariante: dto.skuVariante },
      });
      if (skuEnUso) {
        throw new ConflictException(
          `Ya existe una variante con SKU ${dto.skuVariante}`,
        );
      }
    }

    // El stock NO se edita acá: solo cambia con movimientos (kardex).
    Object.assign(variante, dto);
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

  /**
   * Historial (kardex) con filtros y paginación. Las fechas son días de
   * calendario de Caracas; se convierten a instantes UTC con AT TIME ZONE.
   */
  async consultarMovimientos(
    f: ConsultaMovimientosDto,
  ): Promise<{ datos: MovimientoInventario[]; total: number }> {
    const repo =
      getRlsManager()?.getRepository(MovimientoInventario) ?? this.movimientoRepository;
    const qb = repo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.variante', 'v')
      .leftJoinAndSelect('v.material', 'mat')
      .leftJoinAndSelect('m.usuario', 'u');

    if (f.variante) qb.andWhere('v.id = :variante', { variante: f.variante });
    if (f.material) qb.andWhere('mat.id = :material', { material: f.material });
    if (f.tipo) qb.andWhere('m.tipo = :tipo', { tipo: f.tipo });
    if (f.origen === 'venta') qb.andWhere('m.solicitudId IS NOT NULL');
    if (f.origen === 'manual') qb.andWhere('m.solicitudId IS NULL');
    if (f.desde) {
      qb.andWhere(`m.createdAt >= (:desde::date)::timestamp AT TIME ZONE 'America/Caracas'`, { desde: f.desde });
    }
    if (f.hasta) {
      qb.andWhere(`m.createdAt < ((:hasta::date + 1))::timestamp AT TIME ZONE 'America/Caracas'`, { hasta: f.hasta });
    }
    const texto = f.buscar?.trim();
    if (texto) {
      const patron = `%${texto.replace(/[\\%_]/g, '\\$&')}%`;
      qb.andWhere(
        '(mat.nombre ILIKE :patron OR mat.sku ILIKE :patron OR v.skuVariante ILIKE :patron OR m.motivo ILIKE :patron)',
        { patron },
      );
    }

    const [datos, total] = await qb
      .orderBy('m.createdAt', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .take(f.limite ?? 50)
      .skip(f.desplazamiento ?? 0)
      .getManyAndCount();
    return { datos, total };
  }
}
