import { apiFetch } from "../api/client";
import { etiquetaVariante, type VarianteMaterial } from "../catalogo/catalogo";

export type EstadoCarrito =
  | "nueva"
  | "contactado"
  | "pago_en_verificacion"
  | "pendiente_stock"
  | "cerrada"
  | "cancelada";

export type MetodoPago = "efectivo" | "efectivo_divisas" | "pago_movil" | "transferencia" | "zelle" | "otro";

export const ETIQUETA_ESTADO: Record<EstadoCarrito, string> = {
  nueva: "Nueva",
  contactado: "Contactado",
  pago_en_verificacion: "Pago en verificación",
  pendiente_stock: "Pendiente por stock",
  cerrada: "Cerrada",
  cancelada: "Cancelada",
};

export const TONO_ESTADO: Record<EstadoCarrito, "neutro" | "exito" | "alerta" | "dorado"> = {
  nueva: "dorado",
  contactado: "neutro",
  pago_en_verificacion: "dorado",
  pendiente_stock: "alerta",
  cerrada: "exito",
  cancelada: "neutro",
};

export const ETIQUETA_METODO: Record<MetodoPago, string> = {
  efectivo_divisas: "Efectivo en divisas",
  efectivo: "Efectivo en bolívares",
  pago_movil: "Pago móvil",
  transferencia: "Transferencia",
  zelle: "Zelle",
  otro: "Otro",
};

/** Métodos que dan derecho al descuento por divisas (igual que en el backend). */
export const METODOS_DIVISAS: MetodoPago[] = ["efectivo_divisas", "zelle"];

/** Estados en los que el pedido todavía se puede editar / cerrar. */
export const ESTADOS_ABIERTOS: EstadoCarrito[] = [
  "nueva",
  "contactado",
  "pago_en_verificacion",
  "pendiente_stock",
];

export interface ItemSolicitud {
  id: string;
  cantidad: number;
  precioUnitario: number | null;
  material?: { id: string; nombre: string } | null;
  variante?: (Omit<VarianteMaterial, "precioVenta"> & {
    precioVenta: number;
    material?: { id: string; nombre: string };
  }) | null;
  combo?: { id: string; nombre: string; precioCombo: number } | null;
}

export interface Faltante {
  varianteId: string;
  sku: string;
  requerido: number;
  disponible: number;
  faltan: number;
}

export interface Solicitud {
  id: string;
  numero?: number;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail?: string | null;
  items: ItemSolicitud[];
  estado: EstadoCarrito;
  canalEnvio: string;
  notas?: string | null;
  totalFinal: number | null;
  modificadaDesdeEnvio: boolean;
  metodoPago?: MetodoPago | null;
  referenciaPago?: string | null;
  montoCobrado: number | null;
  descuentoPct: number | null;
  descuentoMonto: number | null;
  tasaBcv: number | null;
  montoCobradoBs: number | null;
  montoReembolsado: number | null;
  motivoCancelacion?: string | null;
  faltantes?: Faltante[] | null;
  cerradaAt?: string | null;
  createdAt: string;
}

export interface Evento {
  id: string;
  tipo: string;
  detalle?: Record<string, unknown> | null;
  usuario?: { nombre?: string } | null;
  createdAt: string;
}

const num = (v: unknown): number | null =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v);

// Los decimales de Postgres llegan como string: se normalizan una sola vez.
function normalizar(s: Solicitud): Solicitud {
  return {
    ...s,
    totalFinal: num(s.totalFinal),
    montoCobrado: num(s.montoCobrado),
    descuentoPct: num(s.descuentoPct),
    descuentoMonto: num(s.descuentoMonto),
    tasaBcv: num(s.tasaBcv),
    montoCobradoBs: num(s.montoCobradoBs),
    montoReembolsado: num(s.montoReembolsado),
    items: (s.items ?? []).map((i) => ({
      ...i,
      precioUnitario: num(i.precioUnitario),
      variante: i.variante
        ? { ...i.variante, stock: Number(i.variante.stock), precioVenta: Number(i.variante.precioVenta) }
        : i.variante,
      combo: i.combo ? { ...i.combo, precioCombo: Number(i.combo.precioCombo) } : i.combo,
    })),
  };
}

const BASE = "/api/v1/carrito/solicitudes";

export async function listarSolicitudes(): Promise<Solicitud[]> {
  const r = await apiFetch<Solicitud[]>(BASE);
  return r.map(normalizar);
}

export async function obtenerSolicitud(id: string): Promise<Solicitud> {
  return normalizar(await apiFetch<Solicitud>(`${BASE}/${id}`));
}

export async function historialSolicitud(id: string): Promise<Evento[]> {
  return apiFetch<Evento[]>(`${BASE}/${id}/historial`);
}

export interface ItemEdicion {
  materialId?: string;
  varianteId?: string;
  comboId?: string;
  cantidad: number;
  precioUnitario?: number;
}

export async function guardarItems(
  id: string,
  items: ItemEdicion[],
  totalFinal?: number | null,
): Promise<Solicitud> {
  const body: { items: ItemEdicion[]; totalFinal?: number | null } = { items };
  if (totalFinal !== undefined) body.totalFinal = totalFinal;
  return normalizar(await apiFetch<Solicitud>(`${BASE}/${id}/items`, { method: "PUT", body: JSON.stringify(body) }));
}

export async function cambiarEstado(id: string, estado: EstadoCarrito, notas?: string): Promise<Solicitud> {
  return normalizar(
    await apiFetch<Solicitud>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify({ estado, notas }) }),
  );
}

export interface RespuestaEnvio {
  mensaje: string;
  telefono: string;
  emailEnviado: boolean;
}

export async function enviarDetalle(id: string): Promise<RespuestaEnvio> {
  return apiFetch<RespuestaEnvio>(`${BASE}/${id}/enviar-detalle`, { method: "POST" });
}

export async function cerrarVenta(
  id: string,
  datos: {
    metodoPago: MetodoPago;
    referenciaPago?: string;
    montoCobrado?: number;
    aplicarDescuento?: boolean;
    tasaBcv?: number;
  },
): Promise<Solicitud> {
  return normalizar(await apiFetch<Solicitud>(`${BASE}/${id}/cerrar`, { method: "POST", body: JSON.stringify(datos) }));
}

export async function cancelarSolicitud(
  id: string,
  datos: { motivo: string; montoReembolsado?: number },
): Promise<Solicitud> {
  return normalizar(await apiFetch<Solicitud>(`${BASE}/${id}/cancelar`, { method: "POST", body: JSON.stringify(datos) }));
}

// --- Presentación ---

export function nombreItem(i: ItemSolicitud): string {
  if (i.combo) return `Combo: ${i.combo.nombre}`;
  if (i.variante) return i.variante.material?.nombre ?? i.variante.skuVariante;
  if (i.material) return i.material.nombre;
  return "(ítem sin referencia)";
}

export function presentacionItem(i: ItemSolicitud): string {
  if (i.variante) return etiquetaVariante(i.variante);
  if (i.material && !i.variante) return "Sin presentación elegida";
  return "";
}

export function dinero(n: number): string {
  return `$${n.toFixed(2)}`;
}

/** Suma de los ítems con precio; `parcial` si alguno aún no lo tiene. */
export function totalDeItems(items: Array<{ cantidad: number; precioUnitario: number | null }>) {
  let total = 0;
  let parcial = false;
  for (const i of items) {
    if (i.precioUnitario === null) parcial = true;
    else total += i.precioUnitario * i.cantidad;
  }
  return { total: Math.round(total * 100) / 100, parcial };
}

export function totalSolicitud(s: Solicitud): { total: number; parcial: boolean } {
  const calc = totalDeItems(s.items);
  return s.totalFinal !== null ? { total: s.totalFinal, parcial: false } : calc;
}

/** wa.me al teléfono del cliente (Venezuela: acepta +58…, 04xx… o 4xx…). */
export function enlaceWhatsAppCliente(telefono: string, mensaje?: string): string {
  let d = telefono.replace(/\D/g, "");
  if (d.startsWith("0")) d = `58${d.slice(1)}`;
  else if (!d.startsWith("58") && d.length === 10) d = `58${d}`;
  return `https://wa.me/${d}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ""}`;
}

export function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export const ETIQUETA_EVENTO: Record<string, string> = {
  estado: "Cambio de estado",
  items_editados: "Pedido editado",
  detalle_enviado: "Detalle enviado al cliente",
  pendiente_stock: "Pago recibido, falta stock",
  cerrada: "Venta cerrada",
  cancelada: "Cancelada",
  anulada: "Venta anulada",
};

/** Misma cuenta que el backend (calcularCobro) para mostrar la vista previa antes de cerrar. */
export function calcularCobroPreview(p: {
  base: number;
  metodo: MetodoPago;
  aplicarDescuento: boolean;
  porcentaje: number;
  montoManual: number | null;
  tasa: number | null;
}) {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  let monto = r2(p.base);
  let descuentoMonto: number | null = null;
  if (p.montoManual !== null) monto = r2(p.montoManual);
  else if (METODOS_DIVISAS.includes(p.metodo) && p.aplicarDescuento && p.porcentaje > 0) {
    descuentoMonto = r2((p.base * p.porcentaje) / 100);
    monto = r2(p.base - descuentoMonto);
  }
  return { monto, descuentoMonto, montoBs: p.tasa ? r2(monto * p.tasa) : null };
}
