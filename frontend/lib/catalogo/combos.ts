import { apiFetch } from "../api/client";
import { etiquetaVariante, type Categoria, type VarianteMaterial } from "./catalogo";

export interface ItemCombo {
  id: string;
  cantidad: number;
  variante: VarianteMaterial & { material?: { id: string; nombre: string; categoria?: Categoria } };
}

export interface Combo {
  id: string;
  nombre: string;
  descripcion?: string;
  precioCombo: number;
  activo: boolean;
  items: ItemCombo[];
}

/** Línea legible de un ítem: "2 × Cemento Portland Gris — 25kg". */
export function lineaItemCombo(item: ItemCombo): string {
  const nombre = item.variante.material?.nombre ?? item.variante.skuVariante;
  const pres = etiquetaVariante(item.variante);
  return `${item.cantidad} × ${nombre}${pres === item.variante.skuVariante ? "" : ` — ${pres}`}`;
}

/** Suma de las partes por separado (precio de referencia para mostrar el ahorro). */
export function precioPorSeparado(combo: Combo): number {
  return combo.items.reduce((s, i) => s + i.variante.precioVenta * i.cantidad, 0);
}

export async function listarCombos(): Promise<Combo[]> {
  const combos = await apiFetch<Combo[]>("/api/v1/catalogo/combos", { autenticado: false });
  return combos.map((c) => ({
    ...c,
    precioCombo: Number(c.precioCombo),
    items: (c.items ?? []).map((i) => ({
      ...i,
      variante: {
        ...i.variante,
        stock: Number(i.variante.stock),
        precioVenta: Number(i.variante.precioVenta),
      },
    })),
  }));
}
