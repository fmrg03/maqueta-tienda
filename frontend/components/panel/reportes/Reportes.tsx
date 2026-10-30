"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { dinero } from "@/lib/panel/carrito";
import {
  etiquetaPeriodo,
  hoyVE,
  reporteGanancias,
  reporteInventario,
  type Agrupacion,
  type InventarioPeriodo,
  type ReporteGanancias,
} from "@/lib/panel/reportes";

const AGRUPACIONES: Array<[Agrupacion, string]> = [["semana", "Por semana"], ["mes", "Por mes"], ["anio", "Por año"]];

function restarDias(fecha: string, n: number) {
  return new Date(new Date(`${fecha}T12:00:00Z`).getTime() - n * 86400000).toISOString().slice(0, 10);
}

const ATAJOS: Array<[string, (hoy: string) => string]> = [
  ["Últimos 30 días", (h) => restarDias(h, 30)],
  ["Este mes", (h) => `${h.slice(0, 7)}-01`],
  ["Este año", (h) => `${h.slice(0, 4)}-01-01`],
];

function Barra({ valor, max, clase, texto }: { valor: number; max: number; clase: string; texto: string }) {
  const pct = max > 0 ? Math.max((Math.abs(valor) / max) * 100, valor !== 0 ? 1.5 : 0) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-4 flex-1 bg-piedra"><div className={clsx("h-4", clase)} style={{ width: `${pct}%` }} /></div>
      <span className="w-24 text-right text-xs tabular-nums">{texto}</span>
    </div>
  );
}

export function Reportes() {
  const hoy = hoyVE();
  const [desde, setDesde] = useState(restarDias(hoy, 30));
  const [hasta, setHasta] = useState(hoy);
  const [agrupacion, setAgrupacion] = useState<Agrupacion>("semana");
  const [res, setRes] = useState<{ clave: string; g: ReporteGanancias; i: InventarioPeriodo[] } | "error" | null>(null);

  const valido = /^\d{4}-\d{2}-\d{2}$/.test(desde) && /^\d{4}-\d{2}-\d{2}$/.test(hasta) && desde <= hasta;
  const clave = `${desde}|${hasta}|${agrupacion}`;

  useEffect(() => {
    if (!valido) return;
    let vigente = true;
    Promise.all([reporteGanancias(desde, hasta, agrupacion), reporteInventario(desde, hasta, agrupacion)])
      .then(([g, i]) => vigente && setRes({ clave, g, i }))
      .catch(() => vigente && setRes("error"));
    return () => {
      vigente = false;
    };
  }, [desde, hasta, agrupacion, valido, clave]);

  const datos = res && res !== "error" && res.clave === clave ? res : null;
  const cargando = valido && !datos && res !== "error";
  const maxV = datos ? Math.max(...datos.g.serie.map((s) => s.ventas), 0) : 0;
  const maxI = datos ? Math.max(...datos.i.flatMap((s) => [s.entradas, s.salidas]), 0) : 0;
  const margen = datos && datos.g.totalVentas > 0 ? (datos.g.ganancia / datos.g.totalVentas) * 100 : null;

  return (
    <div className="max-w-5xl">
      <h1 className="font-serif text-[26px] font-semibold">Reportes</h1>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <p className="mb-6 text-[#8A8272]">Cuánto se vendió, cuánto costó y cuánto quedó de ganancia; y cuánta mercancía entró y salió.</p>

      <div className="mb-6 flex flex-wrap items-end gap-4 bg-white p-4">
        <label className="text-sm">Desde
          <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} className="mt-1 block rounded-sm border border-piedra-oscura px-2 py-1.5" />
        </label>
        <label className="text-sm">Hasta
          <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} className="mt-1 block rounded-sm border border-piedra-oscura px-2 py-1.5" />
        </label>
        <div className="flex flex-wrap gap-2">
          {ATAJOS.map(([l, f]) => (
            <button key={l} type="button" onClick={() => { setDesde(f(hoy)); setHasta(hoy); }} className="rounded-sm border border-piedra-oscura px-3 py-1.5 text-sm hover:border-negro">{l}</button>
          ))}
        </div>
        <div role="group" aria-label="Agrupación" className="flex gap-2">
          {AGRUPACIONES.map(([v, l]) => (
            <button key={v} type="button" aria-pressed={agrupacion === v} onClick={() => setAgrupacion(v)} className={clsx("rounded-sm border px-3 py-1.5 text-sm", agrupacion === v ? "border-negro bg-negro text-texto-claro" : "border-piedra-oscura hover:border-negro")}>{l}</button>
          ))}
        </div>
      </div>

      {!valido && <p role="alert" className="text-vino">Revisa las fechas: «Desde» no puede ser posterior a «Hasta».</p>}
      {res === "error" && <p role="alert" className="text-vino">No pudimos cargar el reporte. Intenta de nuevo.</p>}
      {cargando && <p className="text-[#8A8272]">Cargando…</p>}

      {datos && (
        <div className={clsx("space-y-8", !valido && "opacity-50")}>
          <section aria-label="Resumen" className="grid gap-3 sm:grid-cols-4">
            {[
              ["Ventas", dinero(datos.g.totalVentas)],
              ["Costo", dinero(datos.g.totalCosto)],
              ["Ganancia", dinero(datos.g.ganancia)],
              ["Margen", margen === null ? "—" : `${margen.toFixed(1)}%`],
            ].map(([t, v]) => (
              <div key={t} className="bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-[#8A8272]">{t}</p>
                <p className="mt-1 font-serif text-2xl font-semibold" data-testid={`kpi-${t}`}>{v}</p>
              </div>
            ))}
          </section>

          <section>
            <h2 className="mb-1 font-serif text-lg font-semibold">Ventas y ganancia</h2>
            <p className="mb-3 flex gap-4 text-xs text-[#8A8272]"><span><i className="mr-1 inline-block h-2.5 w-2.5 bg-dorado-oscuro" />Ventas</span><span><i className="mr-1 inline-block h-2.5 w-2.5 bg-esmeralda" />Ganancia</span></p>
            {datos.g.serie.length === 0 ? (
              <p className="bg-white p-6 text-[#8A8272]">No hubo ventas en este período.</p>
            ) : (
              <ul className="space-y-3 bg-white p-4">
                {datos.g.serie.map((s) => (
                  <li key={s.periodo} className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:items-center">
                    <span className="text-sm font-medium">{etiquetaPeriodo(s.periodo, agrupacion)}</span>
                    <div className="space-y-1">
                      <Barra valor={s.ventas} max={maxV} clase="bg-dorado-oscuro" texto={dinero(s.ventas)} />
                      <Barra valor={s.ganancia} max={maxV} clase={s.ganancia >= 0 ? "bg-esmeralda" : "bg-vino"} texto={dinero(s.ganancia)} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-1 font-serif text-lg font-semibold">Entradas y salidas de mercancía</h2>
            <p className="mb-3 flex gap-4 text-xs text-[#8A8272]"><span><i className="mr-1 inline-block h-2.5 w-2.5 bg-negro" />Entradas</span><span><i className="mr-1 inline-block h-2.5 w-2.5 bg-dorado-oscuro" />Salidas</span></p>
            {datos.i.length === 0 ? (
              <p className="bg-white p-6 text-[#8A8272]">No hubo movimientos en este período.</p>
            ) : (
              <ul className="space-y-3 bg-white p-4">
                {datos.i.map((s) => (
                  <li key={s.periodo} className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:items-center">
                    <span className="text-sm font-medium">{etiquetaPeriodo(s.periodo, agrupacion)}</span>
                    <div className="space-y-1">
                      <Barra valor={s.entradas} max={maxI} clase="bg-negro" texto={`${s.entradas} und.`} />
                      <Barra valor={s.salidas} max={maxI} clase="bg-dorado-oscuro" texto={`${s.salidas} und.`} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
