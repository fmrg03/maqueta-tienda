"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import type { Categoria } from "@/lib/catalogo/catalogo";

export type Orden = "nombre" | "precio_asc" | "precio_desc";

const ORDENES: Array<[Orden, string]> = [
  ["nombre", "Nombre (A–Z)"],
  ["precio_asc", "Precio: menor a mayor"],
  ["precio_desc", "Precio: mayor a menor"],
];

/** Buscador, categorías como botones y orden. Todo vive en la URL (se puede compartir). */
export function FiltroCategoria({ categorias }: { categorias: Categoria[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoriaActual = searchParams.get("categoria") ?? "";
  const orden = (searchParams.get("orden") as Orden) || "nombre";
  const [texto, setTexto] = useState(searchParams.get("buscar") ?? "");

  function ir(cambios: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(cambios)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    const q = params.toString();
    router.push(q ? `/catalogo?${q}` : "/catalogo");
  }

  const chip = (activo: boolean) =>
    clsx(
      "border px-4 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado",
      activo ? "border-dorado-claro bg-dorado-claro text-negro font-medium" : "border-linea text-texto-secundario hover:border-dorado-oscuro hover:text-texto-claro",
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            ir({ buscar: texto.trim() });
          }}
          className="flex min-w-[240px] flex-1 gap-2"
        >
          <label htmlFor="buscar-catalogo" className="sr-only">Buscar en el catálogo</label>
          <input
            id="buscar-catalogo"
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar: cemento, pintura, tubo…"
            className="w-full border border-linea bg-negro-suave px-4 py-2.5 text-sm text-texto-claro placeholder:text-apagado focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-dorado"
          />
          <button type="submit" className="border border-dorado-oscuro px-4 py-2.5 text-sm text-dorado-claro transition-colors hover:bg-dorado-claro hover:text-negro">
            Buscar
          </button>
        </form>
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="orden-catalogo" className="text-apagado">Ordenar</label>
          <select
            id="orden-catalogo"
            value={orden}
            onChange={(e) => ir({ orden: e.target.value === "nombre" ? "" : e.target.value })}
            className="border border-linea bg-negro-suave px-3 py-2.5 text-sm text-texto-claro"
          >
            {ORDENES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div role="group" aria-label="Categorías" className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={!categoriaActual} onClick={() => ir({ categoria: "" })} className={chip(!categoriaActual)}>Todas</button>
        {categorias.map((c) => (
          <button key={c.id} type="button" aria-pressed={categoriaActual === c.id} onClick={() => ir({ categoria: c.id })} className={chip(categoriaActual === c.id)}>
            {c.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
