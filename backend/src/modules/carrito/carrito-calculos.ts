/**
 * Lógica pura (sin base de datos) para cerrar una venta del carrito:
 * totales, expansión de combos a variantes y prorrateo del monto cobrado.
 * Vive aparte del servicio para poder probarla a fondo: es la que decide
 * cuánto stock se descuenta y cuánto dinero se registra.
 */

export interface VarianteCalculo {
  id: string;
  skuVariante: string;
  precioVenta: number | string;
  precioCosto: number | string;
}

export interface ItemCalculo {
  cantidad: number;
  /** Precio pactado (editable por el asesor). null = aún sin definir. */
  precioUnitario: number | string | null;
  variante?: VarianteCalculo | null;
  combo?: {
    nombre?: string;
    items: Array<{ cantidad: number; variante: VarianteCalculo }>;
  } | null;
  material?: { nombre?: string } | null;
}

export interface SalidaPlanificada {
  variante: VarianteCalculo;
  cantidad: number;
  /** 4 decimales: el prorrateo de un combo o de un descuento no es exacto a centavos. */
  precioVentaUnitario: number;
  precioCostoUnitario: number;
}

export class CarritoNoCerrableError extends Error {}

const redondear = (valor: number, decimales: number): number => {
  const f = 10 ** decimales;
  return Math.round(valor * f) / f;
};

const aNumero = (valor: number | string | null | undefined): number | null => {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isNaN(n) ? null : n;
};

/** Total de los ítems con precio; `parcial` si alguno aún no tiene. */
export function totalItems(items: ItemCalculo[]): { total: number; parcial: boolean } {
  let total = 0;
  let parcial = false;
  for (const item of items) {
    const precio = aNumero(item.precioUnitario);
    if (precio === null) parcial = true;
    else total += precio * item.cantidad;
  }
  return { total: redondear(total, 2), parcial };
}

/**
 * Convierte los ítems en salidas de inventario por variante.
 * - Variante: sale directo. Combo: se expande a sus variantes componentes.
 * - Un material genérico (sin presentación) o un ítem sin precio no se puede
 *   cerrar: el asesor debe definirlo antes.
 * - El ingreso de cada ítem se reparte entre sus variantes proporcional al
 *   precio de lista, y luego todo se escala para que la suma sea exactamente
 *   `montoCobrado` (si hubo descuento o ajuste). Así el reporte de ganancias
 *   suma el dinero realmente cobrado.
 */
export function planificarSalidas(
  items: ItemCalculo[],
  montoCobrado?: number | null,
): SalidaPlanificada[] {
  interface Acumulado {
    variante: VarianteCalculo;
    cantidad: number;
    ingreso: number;
  }
  const porVariante = new Map<string, Acumulado>();

  const acumular = (v: VarianteCalculo, cantidad: number, ingreso: number) => {
    const actual = porVariante.get(v.id);
    if (actual) {
      actual.cantidad += cantidad;
      actual.ingreso += ingreso;
    } else {
      porVariante.set(v.id, { variante: v, cantidad, ingreso });
    }
  };

  for (const item of items) {
    const precio = aNumero(item.precioUnitario);
    if (item.material && !item.variante && !item.combo) {
      throw new CarritoNoCerrableError(
        `Define la presentación de "${item.material.nombre ?? 'un material'}" antes de cerrar`,
      );
    }
    if (precio === null) {
      throw new CarritoNoCerrableError('Hay ítems sin precio definido');
    }
    const ingresoItem = precio * item.cantidad;

    if (item.variante) {
      acumular(item.variante, item.cantidad, ingresoItem);
    } else if (item.combo) {
      const componentes = item.combo.items ?? [];
      if (componentes.length === 0) {
        throw new CarritoNoCerrableError(
          `El combo "${item.combo.nombre ?? ''}" no tiene componentes`,
        );
      }
      const pesos = componentes.map(
        (c) => (aNumero(c.variante.precioVenta) ?? 0) * c.cantidad,
      );
      const sumaPesos = pesos.reduce((a, b) => a + b, 0);
      componentes.forEach((c, i) => {
        const parte = sumaPesos > 0 ? pesos[i] / sumaPesos : 1 / componentes.length;
        acumular(c.variante, c.cantidad * item.cantidad, ingresoItem * parte);
      });
    } else {
      throw new CarritoNoCerrableError('Hay ítems sin referencia');
    }
  }

  const acumulados = [...porVariante.values()];
  const ingresoLista = acumulados.reduce((s, a) => s + a.ingreso, 0);
  const objetivo = montoCobrado ?? ingresoLista;
  const factor = ingresoLista > 0 ? objetivo / ingresoLista : 1;

  return acumulados.map((a) => ({
    variante: a.variante,
    cantidad: a.cantidad,
    precioVentaUnitario: redondear((a.ingreso * factor) / a.cantidad, 4),
    precioCostoUnitario: redondear(aNumero(a.variante.precioCosto) ?? 0, 4),
  }));
}

export interface Faltante {
  varianteId: string;
  sku: string;
  requerido: number;
  disponible: number;
  faltan: number;
}

/** Compara lo que se necesita contra el stock actual. Vacío = alcanza todo. */
export function calcularFaltantes(
  salidas: SalidaPlanificada[],
  stockPorVariante: Map<string, number>,
): Faltante[] {
  const faltantes: Faltante[] = [];
  for (const s of salidas) {
    const disponible = stockPorVariante.get(s.variante.id) ?? 0;
    if (disponible < s.cantidad) {
      faltantes.push({
        varianteId: s.variante.id,
        sku: s.variante.skuVariante,
        requerido: s.cantidad,
        disponible,
        faltan: s.cantidad - disponible,
      });
    }
  }
  return faltantes;
}
