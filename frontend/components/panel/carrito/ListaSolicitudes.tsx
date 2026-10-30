"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/Badge";
import {
  dinero,
  ESTADOS_ABIERTOS,
  ETIQUETA_ESTADO,
  fechaCorta,
  listarSolicitudes,
  TONO_ESTADO,
  totalSolicitud,
  type EstadoCarrito,
  type Solicitud,
} from "@/lib/panel/carrito";

type Filtro = "abiertas" | EstadoCarrito | "todas";

const FILTROS: Array<{ id: Filtro; label: string }> = [
  { id: "abiertas", label: "Por atender" },
  { id: "nueva", label: "Nuevas" },
  { id: "pendiente_stock", label: "Pendiente por stock" },
  { id: "cerrada", label: "Cerradas" },
  { id: "cancelada", label: "Canceladas" },
  { id: "todas", label: "Todas" },
];

function coincide(s: Solicitud, f: Filtro): boolean {
  if (f === "todas") return true;
  if (f === "abiertas") return ESTADOS_ABIERTOS.includes(s.estado);
  return s.estado === f;
}

export function ListaSolicitudes() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("abiertas");

  useEffect(() => {
    let vigente = true;
    listarSolicitudes()
      .then((s) => vigente && setSolicitudes(s))
      .catch(() => vigente && setError("No pudimos cargar las solicitudes. Intenta de nuevo."));
    return () => {
      vigente = false;
    };
  }, []);

  const visibles = useMemo(() => (solicitudes ?? []).filter((s) => coincide(s, filtro)), [solicitudes, filtro]);
  const conteo = (f: Filtro) => (solicitudes ?? []).filter((s) => coincide(s, f)).length;

  return (
    <div className="max-w-5xl">
      <h1 className="font-serif text-[26px] font-semibold">Solicitudes de carrito</h1>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <p className="mb-6 text-[#8A8272]">
        Consultas que dejaron los clientes. Contáctalos, ajusta el pedido y cierra la venta cuando el pago esté verificado.
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
              filtro === f.id
                ? "border-negro bg-negro text-texto-claro"
                : "border-piedra-oscura bg-white text-negro hover:border-negro",
            )}
          >
            {f.label}
            {solicitudes && <span className="ml-1.5 font-mono text-xs opacity-70">{conteo(f.id)}</span>}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="text-vino">{error}</p>}
      {!solicitudes && !error && <p className="text-[#8A8272]">Cargando…</p>}

      {solicitudes && visibles.length === 0 && (
        <p className="bg-white p-6 text-[#8A8272]">No hay solicitudes en esta vista.</p>
      )}

      {visibles.length > 0 && (
        <ul className="divide-y divide-piedra-oscura bg-white">
          {visibles.map((s) => {
            const { total, parcial } = totalSolicitud(s);
            return (
              <li key={s.id}>
                <Link
                  href={`/panel/carrito/${s.id}`}
                  className="grid items-center gap-x-4 gap-y-1 p-4 transition-colors hover:bg-[#FAF7F0] sm:grid-cols-[1fr_auto_auto]"
                >
                  <div>
                    <p className="font-semibold">{s.clienteNombre}</p>
                    <p className="font-mono text-xs text-[#8A8272]">
                      {s.clienteTelefono} · {s.items.length} {s.items.length === 1 ? "ítem" : "ítems"} · {fechaCorta(s.createdAt)}
                    </p>
                  </div>
                  <p className="font-mono text-sm sm:text-right">
                    {dinero(total)}
                    {parcial && <span className="text-[#8A8272]"> +</span>}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {s.modificadaDesdeEnvio && <Badge tono="alerta">sin enviar</Badge>}
                    <Badge tono={TONO_ESTADO[s.estado]}>{ETIQUETA_ESTADO[s.estado]}</Badge>
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
