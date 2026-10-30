"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/Badge";
import {
  cuandoEs,
  ESTADOS_ABIERTOS_ASESORIA,
  ETIQUETA_ESTADO_ASESORIA,
  fechaLlamada,
  listarAsesorias,
  TONO_ESTADO_ASESORIA,
  type EstadoAsesoria,
  type SolicitudAsesoria,
} from "@/lib/panel/asesorias";

type Filtro = "abiertas" | EstadoAsesoria | "todas";

const FILTROS: Array<{ id: Filtro; label: string }> = [
  { id: "abiertas", label: "Por atender" },
  { id: "pendiente", label: "Pendientes" },
  { id: "llamada_realizada", label: "Llamada realizada" },
  { id: "visita_pactada", label: "Visita pactada" },
  { id: "no_procede", label: "No procede" },
  { id: "cancelada", label: "Canceladas" },
  { id: "todas", label: "Todas" },
];

function coincide(s: SolicitudAsesoria, f: Filtro) {
  if (f === "todas") return true;
  if (f === "abiertas") return ESTADOS_ABIERTOS_ASESORIA.includes(s.estado);
  return s.estado === f;
}

export function ListaAsesorias() {
  const [datos, setDatos] = useState<SolicitudAsesoria[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("abiertas");

  useEffect(() => {
    let vigente = true;
    listarAsesorias()
      .then((d) => vigente && setDatos(d))
      .catch(() => vigente && setError("No pudimos cargar las asesorías. Intenta de nuevo."));
    return () => {
      vigente = false;
    };
  }, []);

  const visibles = useMemo(() => {
    const r = (datos ?? []).filter((s) => coincide(s, filtro));
    // Lo que se atiende primero va arriba; lo ya resuelto, de lo más reciente a lo más antiguo.
    return filtro === "abiertas" || filtro === "pendiente" || filtro === "llamada_realizada"
      ? r
      : [...r].reverse();
  }, [datos, filtro]);
  const conteo = (f: Filtro) => (datos ?? []).filter((s) => coincide(s, f)).length;

  return (
    <div className="max-w-5xl">
      <h1 className="font-serif text-[26px] font-semibold">Asesorías</h1>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <p className="mb-6 text-[#8A8272]">
        Llamadas que los clientes agendaron. Llámalos por WhatsApp a la hora pactada y registra cómo salió.
      </p>

      <div role="tablist" aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filtro === f.id}
            onClick={() => setFiltro(f.id)}
            className={clsx(
              "rounded-sm border px-3 py-1.5 text-sm transition-colors",
              filtro === f.id ? "border-negro bg-negro text-texto-claro" : "border-piedra-oscura bg-white text-negro hover:border-negro",
            )}
          >
            {f.label}
            {datos && <span className="ml-1.5 font-mono text-xs opacity-70">{conteo(f.id)}</span>}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="text-vino">{error}</p>}
      {!datos && !error && <p className="text-[#8A8272]">Cargando…</p>}
      {datos && visibles.length === 0 && <p className="bg-white p-6 text-[#8A8272]">No hay asesorías en esta vista.</p>}

      {visibles.length > 0 && (
        <ul className="divide-y divide-piedra-oscura bg-white">
          {visibles.map((s) => {
            const abierta = ESTADOS_ABIERTOS_ASESORIA.includes(s.estado);
            const cuando = abierta ? cuandoEs(s.fechaHoraLlamada) : null;
            return (
              <li key={s.id}>
                <Link
                  href={`/panel/asesorias/${s.id}`}
                  className="grid items-center gap-x-4 gap-y-1 p-4 transition-colors hover:bg-[#FAF7F0] sm:grid-cols-[1fr_auto_auto]"
                >
                  <div>
                    <p className="font-semibold">{s.clienteNombre}</p>
                    <p className="font-mono text-xs text-[#8A8272]">
                      {s.clienteTelefono}
                      {s.asesor?.usuario?.nombre && ` · ${s.asesor.usuario.nombre}`}
                    </p>
                  </div>
                  <p className="text-sm capitalize sm:text-right">{fechaLlamada(s.fechaHoraLlamada)}</p>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {cuando === "hoy" && <Badge tono="dorado">hoy</Badge>}
                    {cuando === "atrasada" && <Badge tono="alerta">atrasada</Badge>}
                    <Badge tono={TONO_ESTADO_ASESORIA[s.estado]}>{ETIQUETA_ESTADO_ASESORIA[s.estado]}</Badge>
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
