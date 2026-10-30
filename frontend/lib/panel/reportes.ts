import { apiFetch, descargarArchivo } from "../api/client";

export type Agrupacion = "semana" | "mes" | "anio";
export type SeccionReporte = "ventas" | "mercancia" | "proveedores";

export interface GananciaPeriodo { periodo: string; ventas: number; costo: number; ganancia: number }
export interface ReporteGanancias { totalVentas: number; totalCosto: number; ganancia: number; serie: GananciaPeriodo[] }
export interface InventarioPeriodo { periodo: string; entradas: number; salidas: number }
export interface VentaReporte {
  solicitudId: string; numero: number; fecha: string; cliente: string;
  metodoPago: string | null; referenciaPago: string | null;
  ventas: number; costo: number; ganancia: number;
}
export interface CompraDetalle {
  fecha: string; proveedorId: string | null; proveedor: string | null; material: string; sku: string;
  atributos: Record<string, string>; unidades: number; costoUnitario: number | null; total: number | null; motivo: string | null;
}
export interface CompraProveedor { proveedorId: string | null; proveedor: string; entradas: number; unidades: number; total: number; sinCosto: number }
export interface ReporteCompras { totalPagado: number; unidades: number; porProveedor: CompraProveedor[]; detalle: CompraDetalle[] }
export interface MasVendido { material: string; sku: string; atributos: Record<string, string>; unidades: number; ventas: number; ganancia: number }
export interface StockItem { material: string; sku: string; atributos: Record<string, string>; stock: number; valorCosto: number; valorVenta: number }
export interface ReporteStock { unidades: number; valorCosto: number; valorVenta: number; agotados: number; pocoStock: StockItem[]; items: StockItem[] }

// Venezuela es UTC-4 todo el año: el día completo va de 00:00 a 23:59:59 en ese huso.
const rango = (desde: string, hasta: string) =>
  `desde=${encodeURIComponent(`${desde}T00:00:00-04:00`)}&hasta=${encodeURIComponent(`${hasta}T23:59:59.999-04:00`)}`;

export async function reporteGanancias(desde: string, hasta: string, agrupacion: Agrupacion): Promise<ReporteGanancias> {
  const r = await apiFetch<ReporteGanancias>(`/api/v1/reportes/ganancias?${rango(desde, hasta)}&agrupacion=${agrupacion}`);
  return { ...r, totalVentas: Number(r.totalVentas), totalCosto: Number(r.totalCosto), ganancia: Number(r.ganancia) };
}

export const reporteInventario = (desde: string, hasta: string, agrupacion: Agrupacion) =>
  apiFetch<InventarioPeriodo[]>(`/api/v1/reportes/inventario?${rango(desde, hasta)}&agrupacion=${agrupacion}`);

export const reporteVentas = (desde: string, hasta: string) =>
  apiFetch<VentaReporte[]>(`/api/v1/reportes/ventas?${rango(desde, hasta)}`);

export const reporteCompras = (desde: string, hasta: string) =>
  apiFetch<ReporteCompras>(`/api/v1/reportes/compras?${rango(desde, hasta)}`);

export const reporteMasVendidos = (desde: string, hasta: string) =>
  apiFetch<MasVendido[]>(`/api/v1/reportes/mas-vendidos?${rango(desde, hasta)}`);

export const reporteStock = () => apiFetch<ReporteStock>("/api/v1/reportes/stock");

export const exportarReporte = (seccion: SeccionReporte, desde: string, hasta: string, agrupacion: Agrupacion) =>
  descargarArchivo(`/api/v1/reportes/exportar/${seccion}?${rango(desde, hasta)}&agrupacion=${agrupacion}`, `reporte-${seccion}.xlsx`);

/** Fecha de hoy en Venezuela (YYYY-MM-DD). */
export function hoyVE(): string {
  return new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);
}

export function horaVE(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-VE", { timeZone: "America/Caracas", hour: "2-digit", minute: "2-digit" });
}

export function fechaHoraVE(iso: string): string {
  return new Date(iso).toLocaleString("es-VE", { timeZone: "America/Caracas", dateStyle: "short", timeStyle: "short" });
}

export function etiquetaPeriodo(p: string, a: Agrupacion): string {
  const [y, m, d] = p.split("-").map(Number);
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  if (a === "anio") return String(y);
  if (a === "mes") return `${meses[m - 1]} ${y}`;
  return `Sem. ${d} ${meses[m - 1]}`;
}
