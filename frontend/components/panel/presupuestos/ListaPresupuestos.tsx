"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/Badge";
import { PrecioBs } from "@/components/ui/PrecioBs";
import { dinero, fechaCorta } from "@/lib/panel/carrito";
import {
  ETIQUETA_ESTADO_PRESUPUESTO,
  listarPresupuestos,
  numeroPresupuesto,
  TONO_ESTADO_PRESUPUESTO,
  type EstadoPresupuesto,
  type ResumenPresupuesto,
} from "@/lib/panel/presupuestos";

const FILTROS: Array<[EstadoPresupuesto | "", string]> = [
  ["", "Todos"],
  ["borrador", "Borradores"],
  ["enviado", "Enviados"],
  ["aprobado", "Aprobados"],
  ["rechazado", "Rechazados"],
  ["convertido", "Convertidos"],
];

export function ListaPresupuestos() {
  const [estado, setEstado] = useState<EstadoPresupuesto | "">("");
  const [buscar, setBuscar] = useState("");
  const [consulta, setConsulta] = useState("");
  const [res, setRes] = useState<{ clave: string; datos: ResumenPresupuesto[] | null } | null>(null);

  // La búsqueda espera a que se deje de escribir.
  useEffect(() => {
    const t = setTimeout(() => setConsulta(buscar), 300);
    return () => clearTimeout(t);
  }, [buscar]);

  const clave = `${estado}|${consulta}`;
  useEffect(() => {
    let vigente = true;
    listarPresupuestos(estado || undefined, consulta)
      .then((datos) => vigente && setRes({ clave, datos }))
      .catch(() => vigente && setRes({ clave, datos: null }));
    return () => {
      vigente = false;
    };
  }, [estado, consulta, clave]);

  const cargando = res?.clave !== clave;
  const lista = res?.datos ?? null;
  const fallo = !cargando && res?.datos === null;

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-serif text-[26px] font-semibold">Presupuestos</h1>
        <Link href="/panel/presupuestos/nuevo" className="rounded-sm bg-gradient-to-br from-dorado-claro to-dorado-oscuro px-5 py-2.5 text-sm font-semibold text-negro hover:brightness-105">
          Nuevo presupuesto
        </Link>
      </div>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <p className="mb-6 text-[#8A8272]">Cotizaciones a medida con productos del catálogo y servicios como demolición, pegado de cerámica o montaje de porcelanato.</p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Estado" className="flex flex-wrap gap-2">
          {FILTROS.map(([v, l]) => (
            <button key={v} type="button" aria-pressed={estado === v} onClick={() => setEstado(v)} className={clsx("rounded-sm border px-3 py-1.5 text-sm", estado === v ? "border-negro bg-negro text-texto-claro" : "border-piedra-oscura bg-white hover:border-negro")}>
              {l}
            </button>
          ))}
        </div>
        <div className="ml-auto w-full sm:w-64">
          <label htmlFor="buscar-presupuesto" className="sr-only">Buscar presupuesto</label>
          <input id="buscar-presupuesto" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Cliente, obra o número" className="w-full rounded-sm border border-piedra-oscura bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-dorado" />
        </div>
      </div>

      {fallo && <p role="alert" className="text-vino">No pudimos cargar los presupuestos. Intenta de nuevo.</p>}
      {!lista && !fallo && <p className="text-[#8A8272]">Cargando…</p>}
      {lista && lista.length === 0 && <p className="bg-white p-6 text-[#8A8272]">No hay presupuestos en esta vista.</p>}

      {lista && lista.length > 0 && (
        <ul className={clsx("divide-y divide-piedra-oscura bg-white transition-opacity", cargando && "opacity-60")}>
          {lista.map((p) => (
            <li key={p.id}>
              <Link href={`/panel/presupuestos/${p.id}`} className="grid items-center gap-x-4 gap-y-1 p-4 hover:bg-[#FAF7F0] sm:grid-cols-[5rem_1fr_auto_8rem]">
                <p className="font-mono text-sm">N° {numeroPresupuesto(p.numero)}</p>
                <div>
                  <p className="font-semibold">{p.clienteNombre}</p>
                  <p className="text-xs text-[#8A8272]">
                    {[p.obra, `${p.lineas} ${p.lineas === 1 ? "línea" : "líneas"}`, fechaCorta(p.createdAt), p.creadoPorNombre && `por ${p.creadoPorNombre}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="sm:text-right"><Badge tono={TONO_ESTADO_PRESUPUESTO[p.estado]}>{ETIQUETA_ESTADO_PRESUPUESTO[p.estado]}</Badge></div>
                <p className="font-mono text-sm sm:text-right">
                  {dinero(p.total)}
                  <PrecioBs usd={p.total} className="block text-xs text-[#8A8272]" />
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
