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

export const UMBRAL_POCO_STOCK = 5;

export interface VentaReporte {
  solicitudId: string; numero: number; fecha: string; cliente: string;
  metodoPago: string | null; referenciaPago: string | null;
  ventas: number; costo: number; ganancia: number;
}
export interface CompraDetalle {
  fecha: string; proveedorId: string | null; proveedor: string | null; material: string; sku: string;
  atributos: Record<string, string>; unidades: number; costoUnitario: number | null; total: number | null; motivo: string | null;
}
export interface CompraProveedor {
  proveedorId: string | null; proveedor: string; entradas: number; unidades: number; total: number; sinCosto: number;
}
export interface ReporteCompras { totalPagado: number; unidades: number; porProveedor: CompraProveedor[]; detalle: CompraDetalle[] }
export interface MasVendido { material: string; sku: string; atributos: Record<string, string>; unidades: number; ventas: number; ganancia: number }
export interface StockItem { material: string; sku: string; atributos: Record<string, string>; stock: number; valorCosto: number; valorVenta: number }
export interface ReporteStock { unidades: number; valorCosto: number; valorVenta: number; agotados: number; pocoStock: StockItem[]; items: StockItem[] }

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
  private manager() {
    return getRlsManager() ?? this.movimientoRepository.manager;
  }

  /** Cada venta cerrada del rango (una fila por pedido), de la más reciente a la más antigua. */
  async reporteVentas(desde: string, hasta: string): Promise<VentaReporte[]> {
    const filas = await this.manager().query(
      `SELECT s.id, s."numero", s."clienteNombre", s."metodoPago", s."referenciaPago",
              MIN(m."createdAt") AS fecha,
              SUM(m.cantidad * COALESCE(m."precioVentaUnitario", v."precioVenta")) AS ventas,
              SUM(m.cantidad * COALESCE(m."precioCostoUnitario", v."precioCosto")) AS costo
         FROM movimientos_inventario m
         JOIN solicitudes_carrito s ON s.id = m."solicitudId"
         JOIN variantes_material v ON v.id = m."varianteId"
        WHERE m.tipo = 'salida' AND m."createdAt" BETWEEN $1 AND $2 AND s.estado <> 'cancelada'
        GROUP BY s.id
        ORDER BY fecha DESC
        LIMIT 1000`,
      [desde, hasta],
    );
    return filas.map((f: any) => {
      const ventas = Number(f.ventas);
      const costo = Number(f.costo);
      return {
        solicitudId: f.id,
        numero: Number(f.numero),
        fecha: new Date(f.fecha).toISOString(),
        cliente: f.clienteNombre,
        metodoPago: f.metodoPago ?? null,
        referenciaPago: f.referenciaPago ?? null,
        ventas,
        costo,
        ganancia: ventas - costo,
      };
    });
  }

  /** Lo comprado (entradas) en el rango: resumen por proveedor y detalle. */
  async reporteCompras(desde: string, hasta: string): Promise<ReporteCompras> {
    const detalleRaw = await this.manager().query(
      `SELECT m."createdAt" AS fecha, p.id AS "proveedorId", p.nombre AS proveedor,
              mat.nombre AS material, v."skuVariante" AS sku, v.atributos, m.cantidad,
              m."precioCostoUnitario" AS costo, m.motivo
         FROM movimientos_inventario m
         JOIN variantes_material v ON v.id = m."varianteId"
         JOIN materiales mat ON mat.id = v."materialId"
         LEFT JOIN proveedores p ON p.id = m."proveedorId"
        WHERE m.tipo = 'entrada' AND m."createdAt" BETWEEN $1 AND $2
        ORDER BY m."createdAt" DESC
        LIMIT 2000`,
      [desde, hasta],
    );
    const detalle: CompraDetalle[] = detalleRaw.map((f: any) => {
      const costoUnitario = f.costo === null ? null : Number(f.costo);
      return {
        fecha: new Date(f.fecha).toISOString(),
        proveedorId: f.proveedorId ?? null,
        proveedor: f.proveedor ?? null,
        material: f.material,
        sku: f.sku,
        atributos: f.atributos ?? {},
        unidades: Number(f.cantidad),
        costoUnitario,
        total: costoUnitario === null ? null : costoUnitario * Number(f.cantidad),
        motivo: f.motivo ?? null,
      };
    });
    const mapa = new Map<string, CompraProveedor>();
    for (const d of detalle) {
      const clave = d.proveedorId ?? '';
      const r = mapa.get(clave) ?? { proveedorId: d.proveedorId, proveedor: d.proveedor ?? 'Sin proveedor indicado', entradas: 0, unidades: 0, total: 0, sinCosto: 0 };
      r.entradas += 1;
      r.unidades += d.unidades;
      if (d.total === null) r.sinCosto += 1;
      else r.total += d.total;
      mapa.set(clave, r);
    }
    const porProveedor = [...mapa.values()].sort((a, b) => b.total - a.total);
    return {
      totalPagado: porProveedor.reduce((a, r) => a + r.total, 0),
      unidades: porProveedor.reduce((a, r) => a + r.unidades, 0),
      porProveedor,
      detalle,
    };
  }

  /** Productos más vendidos del rango, por unidades. */
  async reporteMasVendidos(desde: string, hasta: string): Promise<MasVendido[]> {
    const filas = await this.manager().query(
      `SELECT mat.nombre AS material, v."skuVariante" AS sku, v.atributos,
              SUM(m.cantidad) AS unidades,
              SUM(m.cantidad * COALESCE(m."precioVentaUnitario", v."precioVenta")) AS ventas,
              SUM(m.cantidad * COALESCE(m."precioVentaUnitario", v."precioVenta"))
                - SUM(m.cantidad * COALESCE(m."precioCostoUnitario", v."precioCosto")) AS ganancia
         FROM movimientos_inventario m
         JOIN variantes_material v ON v.id = m."varianteId"
         JOIN materiales mat ON mat.id = v."materialId"
         LEFT JOIN solicitudes_carrito s ON s.id = m."solicitudId"
        WHERE m.tipo = 'salida' AND m."createdAt" BETWEEN $1 AND $2
          AND (s.id IS NULL OR s.estado <> 'cancelada')
        GROUP BY mat.nombre, v.id
        ORDER BY unidades DESC, ventas DESC
        LIMIT 15`,
      [desde, hasta],
    );
    return filas.map((f: any) => ({
      material: f.material,
      sku: f.sku,
      atributos: f.atributos ?? {},
      unidades: Number(f.unidades),
      ventas: Number(f.ventas),
      ganancia: Number(f.ganancia),
    }));
  }

  /** Foto actual del inventario: unidades y valor, y lo que está agotado o por agotarse. */
  async reporteStock(): Promise<ReporteStock> {
    const filas = await this.manager().query(
      `SELECT mat.nombre AS material, v."skuVariante" AS sku, v.atributos, v.stock,
              v."precioCosto" AS costo, v."precioVenta" AS venta
         FROM variantes_material v
         JOIN materiales mat ON mat.id = v."materialId"
        WHERE mat.activo = true
        ORDER BY v.stock ASC, mat.nombre ASC`,
    );
    const items: StockItem[] = filas.map((f: any) => ({
      material: f.material,
      sku: f.sku,
      atributos: f.atributos ?? {},
      stock: Number(f.stock),
      valorCosto: Number(f.stock) * Number(f.costo),
      valorVenta: Number(f.stock) * Number(f.venta),
    }));
    return {
      unidades: items.reduce((a, i) => a + i.stock, 0),
      valorCosto: items.reduce((a, i) => a + i.valorCosto, 0),
      valorVenta: items.reduce((a, i) => a + i.valorVenta, 0),
      agotados: items.filter((i) => i.stock === 0).length,
      pocoStock: items.filter((i) => i.stock > 0 && i.stock <= UMBRAL_POCO_STOCK),
      items,
    };
  }
}
