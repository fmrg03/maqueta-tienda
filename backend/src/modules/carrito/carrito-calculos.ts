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

export interface ServicioCalculo {
  cantidad: number | string;
  precioUnitario: number | string;
}

/** Total de los servicios (mano de obra) de un pedido. */
export function totalServicios(servicios: ServicioCalculo[] | null | undefined): number {
  let total = 0;
  for (const s of servicios ?? []) total += (aNumero(s.cantidad) ?? 0) * (aNumero(s.precioUnitario) ?? 0);
  return redondear(total, 2);
}

/**
 * Reparte lo cobrado entre productos y servicios en proporción a sus totales
 * de lista, para que el reporte de productos (que sale de los movimientos de
 * inventario) y el de servicios sumen exactamente el dinero cobrado.
 */
export function repartirCobro(
  montoCobrado: number,
  totalProductos: number,
  totalServ: number,
  /** Si el descuento no tocó los servicios, estos conservan exactamente su parte. */
  serviciosFijos?: number,
): { productos: number; servicios: number } {
  if (serviciosFijos !== undefined && totalServ > 0) {
    const servicios = redondear(Math.min(serviciosFijos, montoCobrado), 2);
    return { productos: redondear(montoCobrado - servicios, 2), servicios };
  }
  if (totalServ <= 0) return { productos: redondear(montoCobrado, 2), servicios: 0 };
  if (totalProductos <= 0) return { productos: 0, servicios: redondear(montoCobrado, 2) };
  const servicios = redondear((montoCobrado * totalServ) / (totalProductos + totalServ), 2);
  return { productos: redondear(montoCobrado - servicios, 2), servicios };
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

const METODOS_DIVISAS_TXT = ['efectivo_divisas', 'zelle', 'binance'];
const METODOS_BS_TXT = ['efectivo', 'pago_movil', 'transferencia'];
export const esMetodoDivisas = (m: string) => METODOS_DIVISAS_TXT.includes(m);
export const esMetodoBolivares = (m: string) => METODOS_BS_TXT.includes(m);

export interface TotalesPedido {
  /** Total acordado en dólares BCV (precio de lista, o el total fijado). */
  bcv: number;
  /** Lo que costaría si TODO se paga en divisas (los servicios valen igual). */
  divisas: number;
  /** divisas / bcv (≤ 1): cuánta deuda cubre cada dólar pagado en divisas. */
  factor: number;
  productosBcv: number;
  serviciosBcv: number;
  parcial: boolean;
}

/**
 * Total del pedido a precio BCV y a precio de divisas. Si el asesor fijó un
 * total final, ese es el BCV y el de divisas se le aplica la misma proporción.
 */
export function totalesPedido(
  items: Array<ItemCalculo & { precioDivisasUnitario?: number | string | null }>,
  servicios: ServicioCalculo[] | null | undefined,
  totalFinal?: number | string | null,
): TotalesPedido {
  const { total: productos, parcial } = totalItems(items);
  const serv = totalServicios(servicios);
  let productosDiv = 0;
  for (const i of items) {
    const normal = aNumero(i.precioUnitario);
    if (normal === null) continue;
    productosDiv += (aNumero(i.precioDivisasUnitario) ?? normal) * i.cantidad;
  }
  const lista = redondear(productos + serv, 2);
  const listaDiv = redondear(productosDiv + serv, 2);
  const fijo = aNumero(totalFinal);
  const bcv = fijo ?? lista;
  const factor = lista > 0 ? Math.min(1, listaDiv / lista) : 1;
  const escala = lista > 0 ? bcv / lista : 1;
  return {
    bcv: redondear(bcv, 2),
    divisas: redondear(listaDiv * escala, 2),
    factor,
    productosBcv: redondear(productos * escala, 2),
    serviciosBcv: redondear(serv * escala, 2),
    parcial,
  };
}

/**
 * Cuánta deuda cubre un pago por defecto: en divisas, el monto dividido por el
 * factor (pagar $85 en divisas salda $100 si todo tiene precio de divisas a 85%);
 * en los demás métodos, el monto tal cual.
 */
export function abonoPorDefecto(metodo: string, monto: number, factor: number): number {
  if (esMetodoDivisas(metodo) && factor > 0 && factor < 1) return redondear(monto / factor, 2);
  return redondear(monto, 2);
}

export interface ResumenCobro extends TotalesPedido {
  /** Dinero recibido (USD). */
  recibido: number;
  /** Deuda cubierta (USD BCV). */
  abonado: number;
  /** Lo que falta cubrir (USD BCV); nunca negativo. */
  saldo: number;
  /** Lo que falta si el resto se paga en divisas. */
  saldoDivisas: number;
  pagadoCompleto: boolean;
}

export const TOLERANCIA_SALDO = 0.01;

export function resumenCobro(totales: TotalesPedido, pagos: Array<{ monto: number | string; abona: number | string }>): ResumenCobro {
  const recibido = redondear(pagos.reduce((s, p) => s + Number(p.monto), 0), 2);
  const abonado = redondear(pagos.reduce((s, p) => s + Number(p.abona), 0), 2);
  const saldoBruto = redondear(totales.bcv - abonado, 2);
  const saldo = Math.max(0, saldoBruto);
  return {
    ...totales,
    recibido,
    abonado,
    saldo,
    saldoDivisas: redondear(saldo * totales.factor, 2),
    pagadoCompleto: saldoBruto <= TOLERANCIA_SALDO && totales.bcv > 0,
  };
}
