"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Categoria } from "@/lib/catalogo/catalogo";

interface FiltroCategoriaProps {
  categorias: Categoria[];
}

export function FiltroCategoria({ categorias }: FiltroCategoriaProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoriaActual = searchParams.get("categoria") ?? "";

  function manejarCambio(valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) {
      params.set("categoria", valor);
    } else {
      params.delete("categoria");
    }
    router.push(`/catalogo?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="filtro-categoria" className="text-sm">
        Categoría:
      </label>
      <select
        id="filtro-categoria"
        value={categoriaActual}
        onChange={(e) => manejarCambio(e.target.value)}
        className="border border-dorado-oscuro bg-white px-2.5 py-2 text-sm"
      >
        <option value="">Todas</option>
        {categorias.map((categoria) => (
          <option key={categoria.id} value={categoria.id}>
            {categoria.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
