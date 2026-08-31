import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MovimientoInventario,
  TipoMovimiento,
} from './entities/movimiento-inventario.entity';
import { ReporteQueryDto } from './dto/reporte-query.dto';

export interface ReporteInventarioItem {
  periodo: string;
  entradas: number;
  salidas: number;
}

export interface ReporteGananciasItem {
  totalVentas: number;
  totalCosto: number;
  ganancia: number;
}

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(MovimientoInventario)
    private readonly movimientoRepository: Repository<MovimientoInventario>,
  ) {}

  async reporteInventario(
    query: ReporteQueryDto,
  ): Promise<ReporteInventarioItem[]> {
    const agrupacion = query.agrupacion ?? 'mes';
    const truncFormato =
      agrupacion === 'semana' ? 'week' : agrupacion === 'anio' ? 'year' : 'month';

    const filas = await this.movimientoRepository
      .createQueryBuilder('movimiento')
      .select(`date_trunc('${truncFormato}', movimiento.createdAt)`, 'periodo')
      .addSelect(
        `SUM(CASE WHEN movimiento.tipo = :entrada THEN movimiento.cantidad ELSE 0 END)`,
        'entradas',
      )
      .addSelect(
        `SUM(CASE WHEN movimiento.tipo = :salida THEN movimiento.cantidad ELSE 0 END)`,
        'salidas',
      )
      .where('movimiento.createdAt BETWEEN :desde AND :hasta', {
        desde: query.desde,
        hasta: query.hasta,
      })
      .setParameters({
        entrada: TipoMovimiento.ENTRADA,
        salida: TipoMovimiento.SALIDA,
      })
      .groupBy('periodo')
      .orderBy('periodo', 'ASC')
      .getRawMany();

    return filas.map((fila) => ({
      periodo: fila.periodo,
      entradas: Number(fila.entradas),
      salidas: Number(fila.salidas),
    }));
  }

  async reporteGanancias(
    desde: string,
    hasta: string,
  ): Promise<ReporteGananciasItem> {
    const fila = await this.movimientoRepository
      .createQueryBuilder('movimiento')
      .leftJoin('movimiento.variante', 'variante')
      .leftJoin('variante.material', 'material')
      .select(
        `SUM(CASE WHEN movimiento.tipo = :salida THEN movimiento.cantidad * COALESCE(variante.precioVentaOverride, material.precioVenta) ELSE 0 END)`,
        'totalVentas',
      )
      .addSelect(
        `SUM(CASE WHEN movimiento.tipo = :salida THEN movimiento.cantidad * material.precioCosto ELSE 0 END)`,
        'totalCosto',
      )
      .where('movimiento.createdAt BETWEEN :desde AND :hasta', { desde, hasta })
      .setParameters({ salida: TipoMovimiento.SALIDA })
      .getRawOne();

    const totalVentas = Number(fila?.totalVentas ?? 0);
    const totalCosto = Number(fila?.totalCosto ?? 0);

    return {
      totalVentas,
      totalCosto,
      ganancia: totalVentas - totalCosto,
    };
  }
}
