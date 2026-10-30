import { apiFetch } from "../api/client";
import type { Categoria } from "../catalogo/catalogo";

/** Igual que el backend (MaterialesService.findAll con stock_bajo). */
export const UMBRAL_STOCK_BAJO = 10;

export interface VarianteAdmin {
  id: string;
  skuVariante: string;
  atributos: Record<string, string>;
  stock: number;
  precioVenta: number;
  precioCosto: number;
}

export interface MaterialAdmin {
  id: string;
  sku: string;
  nombre: string;
  descripcion?: string | null;
  imagenUrl?: string | null;
  categoria?: Categoria | null;
  activo: boolean;
  variantes: VarianteAdmin[];
  createdAt: string;
}

export type FiltroEstado = "activos" | "inactivos" | "todos";

// Los decimales de Postgres llegan como string.
const normVariante = (v: VarianteAdmin): VarianteAdmin => ({
  ...v,
  stock: Number(v.stock),
  precioVenta: Number(v.precioVenta),
  precioCosto: Number(v.precioCosto),
});
const norm = (m: MaterialAdmin): MaterialAdmin => ({ ...m, variantes: (m.variantes ?? []).map(normVariante) });

export async function listarMaterialesAdmin(f: {
  estado: FiltroEstado;
  categoriaId?: string;
  buscar?: string;
  stockBajo?: boolean;
}): Promise<MaterialAdmin[]> {
  const q = new URLSearchParams({ estado: f.estado });
  if (f.categoriaId) q.set("categoria", f.categoriaId);
  if (f.buscar?.trim()) q.set("buscar", f.buscar.trim());
  if (f.stockBajo) q.set("stock_bajo", "true");
  return (await apiFetch<MaterialAdmin[]>(`/api/v1/materiales?${q}`)).map(norm);
}

export async function obtenerMaterialAdmin(id: string): Promise<MaterialAdmin> {
  return norm(await apiFetch<MaterialAdmin>(`/api/v1/materiales/${id}`));
}

export interface DatosMaterial {
  sku: string;
  nombre: string;
  descripcion?: string;
  categoriaId?: string;
  imagenUrl?: string;
  activo?: boolean;
}

export async function crearMaterial(d: DatosMaterial): Promise<MaterialAdmin> {
  return norm(await apiFetch<MaterialAdmin>("/api/v1/materiales", { method: "POST", body: JSON.stringify(d) }));
}

export async function actualizarMaterial(id: string, d: Partial<DatosMaterial>): Promise<MaterialAdmin> {
  return norm(await apiFetch<MaterialAdmin>(`/api/v1/materiales/${id}`, { method: "PATCH", body: JSON.stringify(d) }));
}

export interface DatosVariante {
  skuVariante: string;
  atributos: Record<string, string>;
  precioVenta: number;
  precioCosto: number;
}

export async function crearVariante(materialId: string, d: DatosVariante & { stock?: number }): Promise<VarianteAdmin> {
  return normVariante(
    await apiFetch<VarianteAdmin>(`/api/v1/materiales/${materialId}/variantes`, { method: "POST", body: JSON.stringify(d) }),
  );
}

export async function actualizarVariante(id: string, d: Partial<DatosVariante>): Promise<VarianteAdmin> {
  return normVariante(await apiFetch<VarianteAdmin>(`/api/v1/variantes/${id}`, { method: "PATCH", body: JSON.stringify(d) }));
}

export async function registrarMovimiento(
  materialId: string,
  d: { varianteId: string; tipo: "entrada" | "salida"; cantidad: number; motivo?: string },
): Promise<void> {
  await apiFetch(`/api/v1/materiales/${materialId}/movimientos`, { method: "POST", body: JSON.stringify(d) });
}

export async function crearCategoria(nombre: string): Promise<Categoria> {
  return apiFetch<Categoria>("/api/v1/categorias", { method: "POST", body: JSON.stringify({ nombre }) });
}

// --- Presentación ---

export const stockTotal = (m: MaterialAdmin) => m.variantes.reduce((s, v) => s + v.stock, 0);
export const hayStockBajo = (m: MaterialAdmin) => m.variantes.some((v) => v.stock <= UMBRAL_STOCK_BAJO);

/** Margen sobre el precio de venta, en %. null si el precio es 0. */
export function margenPct(venta: number, costo: number): number | null {
  return venta > 0 ? Math.round(((venta - costo) / venta) * 1000) / 10 : null;
}

/** "25kg · Gris" a partir de los atributos de una presentación. */
export const textoAtributos = (a: Record<string, string>) => Object.values(a ?? {}).filter(Boolean).join(" · ");

/** Sugerencia de SKU de presentación: "CEM-001" + "25 kg" → "CEM-001-25KG". */
export function sugerirSkuVariante(skuMaterial: string, atributos: Array<{ valor: string }>): string {
  const sufijo = atributos
    // Sin tildes: "1 galón" → "1GALON" (no "1GALN").
    .map((a) => a.valor.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, ""))
    .filter(Boolean)
    .join("-");
  return sufijo ? `${skuMaterial}-${sufijo}` : "";
}

export function aNumero(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isNaN(n) ? null : n;
}
