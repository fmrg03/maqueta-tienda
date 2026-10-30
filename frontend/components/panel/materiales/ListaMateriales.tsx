"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/Badge";
import { PrecioBs } from "@/components/ui/PrecioBs";
import { listarCategorias, type Categoria } from "@/lib/catalogo/catalogo";
import {
  hayStockBajo,
  listarMaterialesAdmin,
  stockTotal,
  type FiltroEstado,
  type MaterialAdmin,
} from "@/lib/panel/materiales";
import { dinero } from "@/lib/panel/carrito";

const ESTADOS: Array<{ id: FiltroEstado; label: string }> = [
  { id: "activos", label: "Activos" },
  { id: "inactivos", label: "Inactivos" },
  { id: "todos", label: "Todos" },
];

export function ListaMateriales() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [estado, setEstado] = useState<FiltroEstado>("activos");
  const [categoriaId, setCategoriaId] = useState("");
  const [stockBajo, setStockBajo] = useState(false);
  const [texto, setTexto] = useState("");
  const [buscar, setBuscar] = useState(""); // texto con retardo, el que consulta
  const [resultado, setResultado] = useState<{ clave: string; datos: MaterialAdmin[] | null } | null>(null);

  useEffect(() => {
    let vigente = true;
    listarCategorias().then((c) => vigente && setCategorias(c)).catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  // La búsqueda espera a que dejes de escribir.
  useEffect(() => {
    const t = setTimeout(() => setBuscar(texto), 300);
    return () => clearTimeout(t);
  }, [texto]);

  const clave = JSON.stringify([estado, categoriaId, stockBajo, buscar]);
  useEffect(() => {
    let vigente = true;
    listarMaterialesAdmin({ estado, categoriaId: categoriaId || undefined, stockBajo, buscar })
      .then((datos) => vigente && setResultado({ clave, datos }))
      .catch(() => vigente && setResultado({ clave, datos: null }));
    return () => {
      vigente = false;
    };
  }, [clave, estado, categoriaId, stockBajo, buscar]);

  // Mientras llega la respuesta nueva se siguen mostrando (atenuados) los resultados anteriores.
  const cargando = resultado?.clave !== clave;
  const materiales = resultado?.datos ?? null;
  const fallo = !cargando && resultado?.datos === null;

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-serif text-[26px] font-semibold">Materiales</h1>
        <Link
          href="/panel/materiales/nuevo"
          className="rounded-sm bg-gradient-to-br from-dorado-claro to-dorado-oscuro px-5 py-2.5 text-sm font-semibold text-negro hover:brightness-105"
        >
          Nuevo material
        </Link>
      </div>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <p className="mb-6 text-[#8A8272]">Productos del catálogo con sus presentaciones, precios y stock.</p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
          <label htmlFor="buscar" className="text-sm font-medium">Buscar</label>
          <input
            id="buscar"
            type="search"
            value={texto}
            placeholder="Nombre o SKU"
            onChange={(e) => setTexto(e.target.value)}
            className="rounded-sm border border-piedra-oscura bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="cat" className="text-sm font-medium">Categoría</label>
          <select id="cat" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="rounded-sm border border-piedra-oscura bg-white px-3 py-2 text-sm">
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div role="group" aria-label="Estado" className="flex gap-1">
          {ESTADOS.map((e) => (
            <button
              key={e.id}
              aria-pressed={estado === e.id}
              onClick={() => setEstado(e.id)}
              className={clsx(
                "rounded-sm border px-3 py-2 text-sm",
                estado === e.id ? "border-negro bg-negro text-texto-claro" : "border-piedra-oscura bg-white hover:border-negro",
              )}
            >
              {e.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={stockBajo} onChange={(e) => setStockBajo(e.target.checked)} />
          Solo stock bajo
        </label>
      </div>

      {fallo && <p role="alert" className="text-vino">No pudimos cargar los materiales. Intenta de nuevo.</p>}
      {cargando && !materiales && !fallo && <p className="text-[#8A8272]">Cargando…</p>}
      {materiales && materiales.length === 0 && (
        <p className="bg-white p-6 text-[#8A8272]">No hay materiales con estos filtros.</p>
      )}

      {materiales && materiales.length > 0 && (
        <ul className={clsx("divide-y divide-piedra-oscura bg-white", cargando && "opacity-60")}>
          {materiales.map((m) => {
            const precios = m.variantes.map((v) => v.precioVenta);
            const min = precios.length ? Math.min(...precios) : null;
            const max = precios.length ? Math.max(...precios) : null;
            return (
              <li key={m.id}>
                <Link
                  href={`/panel/materiales/${m.id}`}
                  className="grid items-center gap-x-4 gap-y-1 p-4 transition-colors hover:bg-[#FAF7F0] sm:grid-cols-[1fr_auto_auto]"
                >
                  <div>
                    <p className="font-semibold">{m.nombre}</p>
                    <p className="font-mono text-xs text-[#8A8272]">
                      {m.sku}
                      {m.categoria && ` · ${m.categoria.nombre}`} · {m.variantes.length}{" "}
                      {m.variantes.length === 1 ? "presentación" : "presentaciones"}
                    </p>
                  </div>
                  <p className="font-mono text-sm sm:text-right">
                    {min === null ? (
                      <span className="text-vino">sin presentaciones</span>
                    ) : min === max ? (
                      dinero(min)
                    ) : (
                      `${dinero(min)} – ${dinero(max as number)}`
                    )}
                    {min !== null && <PrecioBs usd={min} className="block text-xs text-[#8A8272]" />}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {!m.activo && <Badge>inactivo</Badge>}
                    {hayStockBajo(m) && m.variantes.length > 0 && <Badge tono="alerta">stock bajo</Badge>}
                    <span className="font-mono text-xs text-[#8A8272]">stock {stockTotal(m)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
