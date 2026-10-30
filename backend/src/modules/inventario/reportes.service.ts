import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MovimientoInventario,
  TipoMovimiento,
} from './entities/movimiento-inventario.entity';
import {
  EstadoSolicitudCarrito,
  SolicitudCarrito,
} from '../carrito/entities/solicitud-carrito.entity';
import { getRlsManager } from '../../common/rls/request-context';
import { ReporteQueryDto } from './dto/reporte-query.dto';

export interface ReporteInventarioItem {
  periodo: string;
  entradas: number;
  salidas: number;
}

export interface GananciaPeriodo {
  periodo: string;
  ventas: number;
  costo: number;
  ganancia: number;
}

export interface ReporteGananciasItem {
  totalVentas: number;
  totalCosto: number;
  ganancia: number;
  serie: GananciaPeriodo[];
}

const TRUNC = { semana: 'week', mes: 'month', anio: 'year' } as const;
type Agrupacion = keyof typeof TRUNC;

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(MovimientoInventario)
    private readonly movimientoRepository: Repository<MovimientoInventario>,
  ) {}

  async reporteInventario(
    query: ReporteQueryDto,
  ): Promise<ReporteInventarioItem[]> {
    const truncFormato = TRUNC[query.agrupacion ?? 'mes'];

    const filas = await this.movimientoRepository
      .createQueryBuilder('movimiento')
      .select(`to_char(date_trunc('${truncFormato}', movimiento."createdAt" AT TIME ZONE 'America/Caracas'), 'YYYY-MM-DD')`, 'periodo')
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
    agrupacion: Agrupacion = 'mes',
  ): Promise<ReporteGananciasItem> {
    // Usa el precio congelado en el movimiento (venta de un carrito); las
    // salidas manuales antiguas, sin precio guardado, caen al precio actual.
    // Las ventas anuladas (carrito cancelado tras cerrarse) no cuentan. Se
    // consulta con el manager del request: solicitudes_carrito tiene RLS.
    // Los períodos se cortan en hora de Venezuela.
    const repo = getRlsManager()?.getRepository(MovimientoInventario) ?? this.movimientoRepository;
    const trunc = TRUNC[agrupacion] ?? 'month';
    const filas = await repo
      .createQueryBuilder('movimiento')
      .leftJoin('movimiento.variante', 'variante')
      .leftJoin(SolicitudCarrito, 'solicitud', 'solicitud.id = movimiento.solicitudId')
      .select(
        `to_char(date_trunc('${trunc}', movimiento."createdAt" AT TIME ZONE 'America/Caracas'), 'YYYY-MM-DD')`,
        'periodo',
      )
      .addSelect(
        `SUM(movimiento.cantidad * COALESCE(movimiento.precioVentaUnitario, variante.precioVenta))`,
        'ventas',
      )
      .addSelect(
        `SUM(movimiento.cantidad * COALESCE(movimiento.precioCostoUnitario, variante.precioCosto))`,
        'costo',
      )
      .where('movimiento.tipo = :salida', { salida: TipoMovimiento.SALIDA })
      .andWhere('movimiento.createdAt BETWEEN :desde AND :hasta', { desde, hasta })
      .andWhere('(solicitud.id IS NULL OR solicitud.estado <> :cancelada)', {
        cancelada: EstadoSolicitudCarrito.CANCELADA,
      })
      .groupBy('periodo')
      .orderBy('periodo', 'ASC')
      .getRawMany();

    const serie: GananciaPeriodo[] = filas.map((f) => {
      const ventas = Number(f.ventas ?? 0);
      const costo = Number(f.costo ?? 0);
      return { periodo: f.periodo, ventas, costo, ganancia: ventas - costo };
    });
    const totalVentas = serie.reduce((a, f) => a + f.ventas, 0);
    const totalCosto = serie.reduce((a, f) => a + f.costo, 0);

    return { totalVentas, totalCosto, ganancia: totalVentas - totalCosto, serie };
  }
}
