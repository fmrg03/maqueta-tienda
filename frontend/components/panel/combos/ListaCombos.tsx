"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/Badge";
import { combosArmables, listarCombosAdmin, totalesItems, type ComboAdmin, type FiltroEstadoCombo } from "@/lib/panel/combos";
import { dinero } from "@/lib/panel/carrito";

const FILTROS: Array<[FiltroEstadoCombo, string]> = [["activos", "Activos"], ["inactivos", "Inactivos"], ["todos", "Todos"]];

export function ListaCombos() {
  const [estado, setEstado] = useState<FiltroEstadoCombo>("activos");
  const [res, setRes] = useState<{ estado: FiltroEstadoCombo; datos: ComboAdmin[] | null } | null>(null);

  useEffect(() => {
    let vigente = true;
    listarCombosAdmin(estado)
      .then((datos) => vigente && setRes({ estado, datos }))
      .catch(() => vigente && setRes({ estado, datos: null }));
    return () => {
      vigente = false;
    };
  }, [estado]);

  const cargando = res?.estado !== estado;
  const combos = res?.datos ?? null;
  const fallo = !cargando && res?.datos === null;

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-serif text-[26px] font-semibold">Combos</h1>
        <Link href="/panel/combos/nuevo" className="rounded-sm bg-gradient-to-br from-dorado-claro to-dorado-oscuro px-5 py-2.5 text-sm font-semibold text-negro hover:brightness-105">
          Nuevo combo
        </Link>
      </div>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <p className="mb-6 text-[#8A8272]">Paquetes de productos con un precio especial. Se muestran en la sección Combos de la web.</p>

      <div role="group" aria-label="Estado" className="mb-4 flex gap-2">
        {FILTROS.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={estado === v} onClick={() => setEstado(v)} className={clsx("rounded-sm border px-3 py-1.5 text-sm", estado === v ? "border-negro bg-negro text-texto-claro" : "border-piedra-oscura bg-white hover:border-negro")}>
            {l}
          </button>
        ))}
      </div>

      {fallo && <p role="alert" className="text-vino">No pudimos cargar los combos. Intenta de nuevo.</p>}
      {!combos && !fallo && <p className="text-[#8A8272]">Cargando…</p>}
      {combos && combos.length === 0 && <p className="bg-white p-6 text-[#8A8272]">No hay combos en esta vista.</p>}

      {combos && combos.length > 0 && (
        <ul className={clsx("divide-y divide-piedra-oscura bg-white transition-opacity", cargando && "opacity-60")}>
          {combos.map((c) => {
            const { referencia } = totalesItems(c.items);
            const ahorro = referencia > 0 ? Math.round(((referencia - c.precioCombo) / referencia) * 100) : 0;
            const armables = combosArmables(c.items);
            return (
              <li key={c.id}>
                <Link href={`/panel/combos/${c.id}`} className="grid items-center gap-x-4 gap-y-1 p-4 hover:bg-[#FAF7F0] sm:grid-cols-[1fr_auto_auto]">
                  <div>
                    <p className="font-semibold">{c.nombre}</p>
                    <p className="text-xs text-[#8A8272]">{c.items.length} {c.items.length === 1 ? "producto" : "productos"} · se pueden armar {armables}</p>
                  </div>
                  <p className="font-mono text-sm sm:text-right">
                    {dinero(c.precioCombo)}
                    {ahorro > 0 && <span className="ml-2 text-xs text-esmeralda">−{ahorro}%</span>}
                  </p>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {armables === 0 && <Badge tono="alerta">sin stock</Badge>}
                    {!c.activo && <Badge>inactivo</Badge>}
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
