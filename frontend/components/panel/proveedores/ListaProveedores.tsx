"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/Badge";
import { listarProveedores, type FiltroEstadoProveedor, type ProveedorAdmin } from "@/lib/panel/proveedores";

const FILTROS: Array<[FiltroEstadoProveedor, string]> = [["activos", "Activos"], ["inactivos", "Inactivos"], ["todos", "Todos"]];

export function ListaProveedores() {
  const [estado, setEstado] = useState<FiltroEstadoProveedor>("activos");
  const [res, setRes] = useState<{ estado: FiltroEstadoProveedor; datos: ProveedorAdmin[] | null } | null>(null);

  useEffect(() => {
    let vigente = true;
    listarProveedores(estado)
      .then((datos) => vigente && setRes({ estado, datos }))
      .catch(() => vigente && setRes({ estado, datos: null }));
    return () => {
      vigente = false;
    };
  }, [estado]);

  const cargando = res?.estado !== estado;
  const proveedores = res?.datos ?? null;
  const fallo = !cargando && res?.datos === null;

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-serif text-[26px] font-semibold">Proveedores</h1>
        <Link href="/panel/proveedores/nuevo" className="rounded-sm bg-gradient-to-br from-dorado-claro to-dorado-oscuro px-5 py-2.5 text-sm font-semibold text-negro hover:brightness-105">
          Nuevo proveedor
        </Link>
      </div>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <p className="mb-6 text-[#8A8272]">A quién le compran la mercancía, qué productos suministra cada uno y a qué costo.</p>

      <div role="group" aria-label="Estado" className="mb-4 flex gap-2">
        {FILTROS.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={estado === v} onClick={() => setEstado(v)} className={clsx("rounded-sm border px-3 py-1.5 text-sm", estado === v ? "border-negro bg-negro text-texto-claro" : "border-piedra-oscura bg-white hover:border-negro")}>
            {l}
          </button>
        ))}
      </div>

      {fallo && <p role="alert" className="text-vino">No pudimos cargar los proveedores. Intenta de nuevo.</p>}
      {!proveedores && !fallo && <p className="text-[#8A8272]">Cargando…</p>}
      {proveedores && proveedores.length === 0 && <p className="bg-white p-6 text-[#8A8272]">No hay proveedores en esta vista.</p>}

      {proveedores && proveedores.length > 0 && (
        <ul className={clsx("divide-y divide-piedra-oscura bg-white transition-opacity", cargando && "opacity-60")}>
          {proveedores.map((p) => (
            <li key={p.id}>
              <Link href={`/panel/proveedores/${p.id}`} className="grid items-center gap-x-4 gap-y-1 p-4 hover:bg-[#FAF7F0] sm:grid-cols-[1fr_auto_auto]">
                <div>
                  <p className="font-semibold">{p.nombre}</p>
                  <p className="text-xs text-[#8A8272]">{[p.contacto, p.condicionesPago && `Pago: ${p.condicionesPago}`].filter(Boolean).join(" · ") || "Sin datos de contacto"}</p>
                </div>
                <p className="text-sm sm:text-right">{p.productos ?? 0} {p.productos === 1 ? "producto" : "productos"}</p>
                <div className="sm:text-right">{!p.activo && <Badge>inactivo</Badge>}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
