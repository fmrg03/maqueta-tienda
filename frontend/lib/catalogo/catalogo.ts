import { apiFetch } from "../api/client";

export interface Categoria {
  id: string;
  nombre: string;
}

export interface VarianteMaterial {
  id: string;
  skuVariante: string;
  atributos: Record<string, string>;
  stock: number;
  precioVenta: number;
  precioCosto: number;
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

  return apiFetch(`/api/v1/catalogo/materiales?${params.toString()}`, {
    autenticado: false,
  });
}
