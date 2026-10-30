import { apiFetch } from "../api/client";
import type { VarianteAdmin } from "./materiales";

export interface ItemComboAdmin {
  id?: string;
  cantidad: number;
  variante: VarianteAdmin & { material?: { id: string; nombre: string } };
}

export interface ComboAdmin {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precioCombo: number;
  activo: boolean;
  items: ItemComboAdmin[];
}

export type FiltroEstadoCombo = "activos" | "inactivos" | "todos";

const norm = (c: ComboAdmin): ComboAdmin => ({
  ...c,
  precioCombo: Number(c.precioCombo),
  items: (c.items ?? []).map((i) => ({
    ...i,
    cantidad: Number(i.cantidad),
    variante: {
      ...i.variante,
      stock: Number(i.variante.stock),
      precioVenta: Number(i.variante.precioVenta),
      precioCosto: Number(i.variante.precioCosto),
    },
  })),
});

export async function listarCombosAdmin(estado: FiltroEstadoCombo): Promise<ComboAdmin[]> {
  return (await apiFetch<ComboAdmin[]>(`/api/v1/combos?estado=${estado}`)).map(norm);
}

export async function obtenerComboAdmin(id: string): Promise<ComboAdmin> {
  return norm(await apiFetch<ComboAdmin>(`/api/v1/combos/${id}`));
}

export interface DatosCombo {
  nombre: string;
  descripcion?: string;
  precioCombo: number;
  activo?: boolean;
  items: Array<{ varianteId: string; cantidad: number }>;
}

export async function crearCombo(d: Omit<DatosCombo, "activo">): Promise<ComboAdmin> {
  return norm(await apiFetch<ComboAdmin>("/api/v1/combos", { method: "POST", body: JSON.stringify(d) }));
}

export async function actualizarCombo(id: string, d: Partial<DatosCombo>): Promise<ComboAdmin> {
  return norm(await apiFetch<ComboAdmin>(`/api/v1/combos/${id}`, { method: "PATCH", body: JSON.stringify(d) }));
}

/** Lo que costaría comprar todo por separado, y lo que cuesta a la tienda. */
export function totalesItems(items: Array<{ cantidad: number; variante: Pick<VarianteAdmin, "precioVenta" | "precioCosto"> }>) {
  return {
    referencia: items.reduce((s, i) => s + i.cantidad * i.variante.precioVenta, 0),
    costo: items.reduce((s, i) => s + i.cantidad * i.variante.precioCosto, 0),
  };
}

/** Cuántos combos completos se pueden armar con el stock actual. */
export function combosArmables(items: ItemComboAdmin[]): number {
  if (items.length === 0) return 0;
  return Math.min(...items.map((i) => Math.floor(i.variante.stock / Math.max(1, i.cantidad))));
}
