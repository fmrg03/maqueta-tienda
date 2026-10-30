import { apiFetch } from "../api/client";

export type Agrupacion = "semana" | "mes" | "anio";

export interface GananciaPeriodo { periodo: string; ventas: number; costo: number; ganancia: number }
export interface ReporteGanancias { totalVentas: number; totalCosto: number; ganancia: number; serie: GananciaPeriodo[] }
export interface InventarioPeriodo { periodo: string; entradas: number; salidas: number }

// Venezuela es UTC-4 todo el año: el día completo va de 00:00 a 23:59:59 en ese huso.
const rango = (desde: string, hasta: string) =>
  `desde=${encodeURIComponent(`${desde}T00:00:00-04:00`)}&hasta=${encodeURIComponent(`${hasta}T23:59:59.999-04:00`)}`;

export async function reporteGanancias(desde: string, hasta: string, agrupacion: Agrupacion): Promise<ReporteGanancias> {
  const r = await apiFetch<ReporteGanancias>(`/api/v1/reportes/ganancias?${rango(desde, hasta)}&agrupacion=${agrupacion}`);
  return { ...r, totalVentas: Number(r.totalVentas), totalCosto: Number(r.totalCosto), ganancia: Number(r.ganancia) };
}

export const reporteInventario = (desde: string, hasta: string, agrupacion: Agrupacion) =>
  apiFetch<InventarioPeriodo[]>(`/api/v1/reportes/inventario?${rango(desde, hasta)}&agrupacion=${agrupacion}`);

/** Fecha de hoy en Venezuela (YYYY-MM-DD). */
export function hoyVE(): string {
  return new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);
}

export function etiquetaPeriodo(p: string, a: Agrupacion): string {
  const [y, m, d] = p.split("-").map(Number);
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  if (a === "anio") return String(y);
  if (a === "mes") return `${meses[m - 1]} ${y}`;
  return `Sem. ${d} ${meses[m - 1]}`;
}
