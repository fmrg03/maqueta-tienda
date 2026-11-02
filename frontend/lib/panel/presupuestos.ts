import { apiFetch, descargarArchivo } from "../api/client";
import { etiquetaVariante, listarMateriales } from "../catalogo/catalogo";
import { listarCombos } from "../catalogo/combos";

export type EstadoPresupuesto = "borrador" | "enviado" | "aprobado" | "rechazado" | "convertido";
export type TipoLinea = "producto" | "combo" | "servicio";

export const ETIQUETA_ESTADO_PRESUPUESTO: Record<EstadoPresupuesto, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  convertido: "Convertido en solicitud",
};

export const TONO_ESTADO_PRESUPUESTO: Record<EstadoPresupuesto, "neutro" | "exito" | "alerta" | "dorado"> = {
  borrador: "neutro",
  enviado: "dorado",
  aprobado: "exito",
  rechazado: "alerta",
  convertido: "exito",
};

export const UNIDADES_SUGERIDAS = ["m²", "m", "unidad", "global", "día", "hora", "saco", "viaje"];

export interface LineaPresupuesto {
  id?: string;
  tipo: TipoLinea;
  varianteId?: string | null;
  comboId?: string | null;
  servicioId?: string | null;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
}

export interface TotalesPresupuesto {
  subtotalProductos: number;
  subtotalServicios: number;
  subtotal: number;
  descuentoPct: number;
  descuentoMonto: number;
  total: number;
}

export interface Presupuesto {
  id: string;
  numero: number;
  clienteNombre: string;
  clienteTelefono?: string | null;
  clienteEmail?: string | null;
  obra?: string | null;
  notas?: string | null;
  validezDias: number;
  descuentoPct: number;
  estado: EstadoPresupuesto;
  solicitudId?: string | null;
  creadoPorNombre?: string | null;
  createdAt: string;
  items: LineaPresupuesto[];
  totales: TotalesPresupuesto;
}

export interface ResumenPresupuesto {
  id: string;
  numero: number;
  clienteNombre: string;
  obra?: string | null;
  estado: EstadoPresupuesto;
  creadoPorNombre?: string | null;
  createdAt: string;
  total: number;
  lineas: number;
  solicitudId?: string | null;
}

export interface DatosPresupuesto {
  clienteNombre: string;
  clienteTelefono?: string;
  clienteEmail?: string;
  obra?: string;
  notas?: string;
  validezDias: number;
  descuentoPct: number;
  items: LineaPresupuesto[];
}

export interface Servicio {
  id: string;
  nombre: string;
  descripcion?: string | null;
  unidad: string;
  precioBase: number;
  activo: boolean;
}

export const numeroPresupuesto = (n: number) => String(n).padStart(4, "0");

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const importeLinea = (l: Pick<LineaPresupuesto, "cantidad" | "precioUnitario">) => r2(Number(l.cantidad) * Number(l.precioUnitario));

/** Misma cuenta que el backend (calcularTotales), para mostrar los totales mientras se edita. */
export function calcularTotales(lineas: LineaPresupuesto[], descuentoPct: number): TotalesPresupuesto {
  const sub = (f: (l: LineaPresupuesto) => boolean) => r2(lineas.filter(f).reduce((s, l) => s + importeLinea(l), 0));
  const subtotalProductos = sub((l) => l.tipo !== "servicio");
  const subtotalServicios = sub((l) => l.tipo === "servicio");
  const subtotal = r2(subtotalProductos + subtotalServicios);
  const pct = Math.min(100, Math.max(0, Number(descuentoPct) || 0));
  const descuentoMonto = r2((subtotal * pct) / 100);
  return { subtotalProductos, subtotalServicios, subtotal, descuentoPct: pct, descuentoMonto, total: r2(subtotal - descuentoMonto) };
}

const normalizar = (p: Presupuesto): Presupuesto => ({
  ...p,
  descuentoPct: Number(p.descuentoPct),
  items: (p.items ?? []).map((i) => ({ ...i, cantidad: Number(i.cantidad), precioUnitario: Number(i.precioUnitario) })),
});

export const listarPresupuestos = (estado?: EstadoPresupuesto, buscar?: string) => {
  const q = new URLSearchParams();
  if (estado) q.set("estado", estado);
  if (buscar?.trim()) q.set("buscar", buscar.trim());
  return apiFetch<ResumenPresupuesto[]>(`/api/v1/presupuestos${q.size ? `?${q}` : ""}`).then((l) => l.map((x) => ({ ...x, total: Number(x.total) })));
};

export const obtenerPresupuesto = (id: string) => apiFetch<Presupuesto>(`/api/v1/presupuestos/${id}`).then(normalizar);

const cuerpo = (d: DatosPresupuesto) =>
  JSON.stringify({
    ...d,
    clienteTelefono: d.clienteTelefono?.trim() || undefined,
    clienteEmail: d.clienteEmail?.trim() || undefined,
    obra: d.obra?.trim() || undefined,
    notas: d.notas?.trim() || undefined,
    items: d.items.map((i) => ({
      tipo: i.tipo,
      varianteId: i.varianteId ?? undefined,
      comboId: i.comboId ?? undefined,
      servicioId: i.servicioId ?? undefined,
      descripcion: i.descripcion,
      unidad: i.unidad,
      cantidad: i.cantidad,
      precioUnitario: i.precioUnitario,
    })),
  });

export const crearPresupuesto = (d: DatosPresupuesto) =>
  apiFetch<Presupuesto>("/api/v1/presupuestos", { method: "POST", body: cuerpo(d) }).then(normalizar);

export const guardarPresupuesto = (id: string, d: DatosPresupuesto) =>
  apiFetch<Presupuesto>(`/api/v1/presupuestos/${id}`, { method: "PUT", body: cuerpo(d) }).then(normalizar);

export const cambiarEstadoPresupuesto = (id: string, estado: Exclude<EstadoPresupuesto, "convertido">) =>
  apiFetch<Presupuesto>(`/api/v1/presupuestos/${id}/estado`, { method: "PATCH", body: JSON.stringify({ estado }) }).then(normalizar);

export const eliminarPresupuesto = (id: string) => apiFetch<void>(`/api/v1/presupuestos/${id}`, { method: "DELETE" });

export const enviarPresupuesto = (id: string) =>
  apiFetch<{ mensaje: string; telefono: string | null; enlace: string; estado: EstadoPresupuesto }>(`/api/v1/presupuestos/${id}/enviar`, { method: "POST" });

export const convertirPresupuesto = (id: string) =>
  apiFetch<{ solicitudId: string; numeroSolicitud: number | null }>(`/api/v1/presupuestos/${id}/convertir`, { method: "POST" });

export const descargarPdfPresupuesto = (id: string, numero: number) =>
  descargarArchivo(`/api/v1/presupuestos/${id}/pdf`, `Presupuesto-${numeroPresupuesto(numero)}.pdf`);

// --- Servicios guardados ---
export type FiltroServicios = "activos" | "inactivos" | "todos";

const normServicio = (s: Servicio): Servicio => ({ ...s, precioBase: Number(s.precioBase) });

export const listarServicios = (estado: FiltroServicios = "activos") =>
  apiFetch<Servicio[]>(`/api/v1/servicios?estado=${estado}`).then((l) => l.map(normServicio));

export interface DatosServicio {
  nombre: string;
  descripcion?: string;
  unidad: string;
  precioBase: number;
}

export const crearServicio = (d: DatosServicio) =>
  apiFetch<Servicio>("/api/v1/servicios", { method: "POST", body: JSON.stringify(d) }).then(normServicio);

export const actualizarServicio = (id: string, d: Partial<DatosServicio> & { activo?: boolean }) =>
  apiFetch<Servicio>(`/api/v1/servicios/${id}`, { method: "PATCH", body: JSON.stringify(d) }).then(normServicio);

// --- Catálogo de productos para armar líneas (público: sin costos) ---
export interface OpcionCatalogo {
  clave: string;
  tipo: "producto" | "combo";
  varianteId?: string;
  comboId?: string;
  descripcion: string;
  categoria?: string;
  sku?: string;
  stock?: number;
  precio: number;
}

export async function cargarCatalogoParaPresupuesto(): Promise<OpcionCatalogo[]> {
  const opciones: OpcionCatalogo[] = [];
  let pagina = 1;
  for (;;) {
    const r = await listarMateriales(pagina, 100);
    for (const m of r.items) {
      for (const v of m.variantes) {
        const detalle = etiquetaVariante(v);
        opciones.push({
          clave: `v-${v.id}`,
          tipo: "producto",
          varianteId: v.id,
          descripcion: detalle === v.skuVariante ? m.nombre : `${m.nombre} — ${detalle}`,
          categoria: m.categoria?.nombre,
          sku: v.skuVariante,
          stock: v.stock,
          precio: v.precioVenta,
        });
      }
    }
    if (pagina * r.porPagina >= r.total || r.items.length === 0) break;
    pagina += 1;
  }
  for (const c of await listarCombos().catch(() => [])) {
    opciones.push({
      clave: `c-${c.id}`,
      tipo: "combo",
      comboId: c.id,
      descripcion: /^combo\b/i.test(c.nombre) ? c.nombre : `Combo ${c.nombre}`,
      categoria: "Combos",
      precio: c.precioCombo,
    });
  }
  return opciones;
}
