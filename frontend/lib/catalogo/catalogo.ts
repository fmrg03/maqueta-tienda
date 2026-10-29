import { apiFetch } from "../api/client";

export interface Categoria {
  id: string;
  nombre: string;
}

// El catálogo público NUNCA trae precioCosto (el backend lo elimina).
export interface VarianteMaterial {
  id: string;
  skuVariante: string;
  atributos: Record<string, string>;
  stock: number;
  precioVenta: number;
}

export interface Material {
  id: string;
  sku: string;
  nombre: string;
  descripcion?: string;
  imagenUrl?: string;
  categoria?: Categoria;
  activo: boolean;
  variantes: VarianteMaterial[];
  createdAt: string;
}

// TypeORM devuelve las columnas decimal como string; se normaliza acá
// una sola vez para que el resto de la UI trabaje con números.
function normalizarMaterial(m: Material): Material {
  return {
    ...m,
    variantes: (m.variantes ?? []).map((v) => ({
      ...v,
      stock: Number(v.stock),
      precioVenta: Number(v.precioVenta),
    })),
  };
}

/** Texto corto de una presentación: "25kg", "60x60 · Gris" o, si no hay atributos, el SKU. */
export function etiquetaVariante(variante: VarianteMaterial): string {
  const valores = Object.values(variante.atributos ?? {}).filter(Boolean);
  return valores.length > 0 ? valores.join(" · ") : variante.skuVariante;
}

export async function listarCategorias(): Promise<Categoria[]> {
  return apiFetch<Categoria[]>("/api/v1/catalogo/categorias", {
    autenticado: false,
  });
}

export async function listarMateriales(
  pagina = 1,
  porPagina = 20,
  categoriaId?: string,
): Promise<{ items: Material[]; total: number; pagina: number; porPagina: number }> {
  const params = new URLSearchParams({
    pagina: String(pagina),
    por_pagina: String(porPagina),
  });
  if (categoriaId) params.set("categoria", categoriaId);

  const res = await apiFetch<{
    items: Material[];
    total: number;
    pagina: number;
    porPagina: number;
  }>(`/api/v1/catalogo/materiales?${params.toString()}`, { autenticado: false });
  return { ...res, items: res.items.map(normalizarMaterial) };
}

export async function obtenerMaterial(id: string): Promise<Material> {
  const m = await apiFetch<Material>(
    `/api/v1/catalogo/materiales/${encodeURIComponent(id)}`,
    { autenticado: false },
  );
  return normalizarMaterial(m);
}
