"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/Badge";
import { listarAsesoresAdmin, type AsesorAdmin, type FiltroEstadoAsesor } from "@/lib/panel/asesores";

const FILTROS: Array<[FiltroEstadoAsesor, string]> = [["activos", "Activos"], ["inactivos", "Inactivos"], ["todos", "Todos"]];

export function ListaAsesores() {
  const [estado, setEstado] = useState<FiltroEstadoAsesor>("activos");
  const [res, setRes] = useState<{ estado: FiltroEstadoAsesor; datos: AsesorAdmin[] | null } | null>(null);

  useEffect(() => {
    let vigente = true;
    listarAsesoresAdmin(estado)
      .then((datos) => vigente && setRes({ estado, datos }))
      .catch(() => vigente && setRes({ estado, datos: null }));
    return () => {
      vigente = false;
    };
  }, [estado]);

  const cargando = res?.estado !== estado;
  const asesores = res?.datos ?? null;
  const fallo = !cargando && res?.datos === null;

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-serif text-[26px] font-semibold">Asesores</h1>
        <Link href="/panel/asesores/nuevo" className="rounded-sm bg-gradient-to-br from-dorado-claro to-dorado-oscuro px-5 py-2.5 text-sm font-semibold text-negro hover:brightness-105">
          Nuevo asesor
        </Link>
      </div>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <p className="mb-2 text-[#8A8272]">Las personas que atienden las llamadas de asesoría y los horarios que los clientes pueden elegir.</p>
      <p className="mb-6 text-sm">
        <Link href="/agendar-asesoria" target="_blank" className="underline">Ver cómo lo ve el cliente ↗</Link>
      </p>

      <div role="group" aria-label="Estado" className="mb-4 flex gap-2">
        {FILTROS.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={estado === v} onClick={() => setEstado(v)} className={clsx("rounded-sm border px-3 py-1.5 text-sm", estado === v ? "border-negro bg-negro text-texto-claro" : "border-piedra-oscura bg-white hover:border-negro")}>
            {l}
          </button>
        ))}
      </div>

      {fallo && <p role="alert" className="text-vino">No pudimos cargar los asesores. Intenta de nuevo.</p>}
      {!asesores && !fallo && <p className="text-[#8A8272]">Cargando…</p>}
      {asesores && asesores.length === 0 && <p className="bg-white p-6 text-[#8A8272]">No hay asesores en esta vista.</p>}

      {asesores && asesores.length > 0 && (
        <ul className={clsx("divide-y divide-piedra-oscura bg-white transition-opacity", cargando && "opacity-60")}>
          {asesores.map((a) => (
            <li key={a.id}>
              <Link href={`/panel/asesores/${a.id}`} className="grid items-center gap-x-4 gap-y-1 p-4 hover:bg-[#FAF7F0] sm:grid-cols-[1fr_auto_auto]">
                <div>
                  <p className="font-semibold">{a.nombre}{a.especialidad && <span className="font-normal text-[#8A8272]"> · {a.especialidad}</span>}</p>
                  <p className="font-mono text-xs text-[#8A8272]">{a.email}{a.telefono && ` · ${a.telefono}`}</p>
                </div>
                <p className="text-sm sm:text-right">
                  {a.franjasLibres} {a.franjasLibres === 1 ? "horario libre" : "horarios libres"}
                  {a.asesoriasPendientes > 0 && <span className="text-[#8A8272]"> · {a.asesoriasPendientes} por atender</span>}
                </p>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {a.activo && a.franjasLibres === 0 && <Badge tono="alerta">sin horarios</Badge>}
                  {!a.activo && <Badge>inactivo</Badge>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
