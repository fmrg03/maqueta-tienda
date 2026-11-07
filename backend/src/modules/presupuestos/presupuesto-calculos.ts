/**
 * Cuentas de un presupuesto (sin base de datos, para probarlas a fondo).
 * Los totales nunca se guardan: se calculan siempre desde las líneas, así no
 * pueden quedar desfasados.
 */

export type TipoLinea = 'producto' | 'combo' | 'servicio';

export interface LineaCalculo {
  tipo: TipoLinea;
  cantidad: number | string;
  precioUnitario: number | string;
  /** Precio de la unidad pagando en divisas (productos y combos); null = el mismo. */
  precioDivisasUnitario?: number | string | null;
}

export interface TotalesPresupuesto {
  subtotalProductos: number;
  subtotalServicios: number;
  subtotal: number;
  descuentoPct: number;
  descuentoMonto: number;
  total: number;
  /** Total si se paga todo en divisas (los servicios valen igual). */
  totalDivisas: number;
}

const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export const importeLinea = (l: Pick<LineaCalculo, 'cantidad' | 'precioUnitario'>): number =>
  r2(Number(l.cantidad) * Number(l.precioUnitario));

export function calcularTotales(lineas: LineaCalculo[], descuentoPct: number | string = 0): TotalesPresupuesto {
  let subtotalProductos = 0;
  let subtotalServicios = 0;
  let productosDivisas = 0;
  for (const l of lineas) {
    if (l.tipo === 'servicio') subtotalServicios += importeLinea(l);
    else {
      subtotalProductos += importeLinea(l);
      const d = l.precioDivisasUnitario;
      productosDivisas += d !== null && d !== undefined ? r2(Number(l.cantidad) * Number(d)) : importeLinea(l);
    }
  }
  subtotalProductos = r2(subtotalProductos);
  subtotalServicios = r2(subtotalServicios);
  const subtotal = r2(subtotalProductos + subtotalServicios);
  const pct = Math.min(100, Math.max(0, Number(descuentoPct) || 0));
  const descuentoMonto = r2((subtotal * pct) / 100);
  const subtotalDivisas = r2(productosDivisas + subtotalServicios);
  return {
    subtotalProductos,
    subtotalServicios,
    subtotal,
    descuentoPct: pct,
    descuentoMonto,
    total: r2(subtotal - descuentoMonto),
    totalDivisas: r2(subtotalDivisas - (subtotalDivisas * pct) / 100),
  };
}
