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
}

export interface TotalesPresupuesto {
  subtotalProductos: number;
  subtotalServicios: number;
  subtotal: number;
  descuentoPct: number;
  descuentoMonto: number;
  total: number;
}

const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export const importeLinea = (l: Pick<LineaCalculo, 'cantidad' | 'precioUnitario'>): number =>
  r2(Number(l.cantidad) * Number(l.precioUnitario));

export function calcularTotales(lineas: LineaCalculo[], descuentoPct: number | string = 0): TotalesPresupuesto {
  let subtotalProductos = 0;
  let subtotalServicios = 0;
  for (const l of lineas) {
    if (l.tipo === 'servicio') subtotalServicios += importeLinea(l);
    else subtotalProductos += importeLinea(l);
  }
  subtotalProductos = r2(subtotalProductos);
  subtotalServicios = r2(subtotalServicios);
  const subtotal = r2(subtotalProductos + subtotalServicios);
  const pct = Math.min(100, Math.max(0, Number(descuentoPct) || 0));
  const descuentoMonto = r2((subtotal * pct) / 100);
  return {
    subtotalProductos,
    subtotalServicios,
    subtotal,
    descuentoPct: pct,
    descuentoMonto,
    total: r2(subtotal - descuentoMonto),
  };
}

/** Total de solo los productos y combos, con el mismo descuento (lo que pasa al carrito). */
export function totalProductosConDescuento(lineas: LineaCalculo[], descuentoPct: number | string = 0): number {
  const t = calcularTotales(lineas.filter((l) => l.tipo !== 'servicio'), descuentoPct);
  return t.total;
}
