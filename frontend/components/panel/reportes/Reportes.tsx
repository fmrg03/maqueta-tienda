"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { ApiError } from "@/lib/api/client";
import { exportarReporte, hoyVE, type Agrupacion, type SeccionReporte } from "@/lib/panel/reportes";
import { SeccionMercancia } from "./SeccionMercancia";
import { SeccionProveedores } from "./SeccionProveedores";
import { SeccionVentas, type ModoVentas } from "./SeccionVentas";

const SECCIONES: Array<[SeccionReporte, string]> = [["ventas", "Ventas y ganancia"], ["mercancia", "Mercancía"], ["proveedores", "Proveedores"]];
const MODOS_VENTAS: Array<[ModoVentas, string]> = [["dia", "Diario"], ["semana", "Por semana"], ["mes", "Por mes"], ["anio", "Por año"]];
const MODOS_MERCANCIA: Array<[Agrupacion, string]> = [["semana", "Por semana"], ["mes", "Por mes"], ["anio", "Por año"]];

function restarDias(fecha: string, n: number) {
  return new Date(new Date(`${fecha}T12:00:00Z`).getTime() - n * 86400000).toISOString().slice(0, 10);
}

const ATAJOS: Array<[string, (hoy: string) => string]> = [
  ["Últimos 30 días", (h) => restarDias(h, 30)],
  ["Este mes", (h) => `${h.slice(0, 7)}-01`],
  ["Este año", (h) => `${h.slice(0, 4)}-01-01`],
];

const boton = (activo: boolean) => clsx("rounded-sm border px-3 py-1.5 text-sm", activo ? "border-negro bg-negro text-texto-claro" : "border-piedra-oscura hover:border-negro");

export function Reportes() {
  const hoy = hoyVE();
  const [seccion, setSeccion] = useState<SeccionReporte>("ventas");
  const [modo, setModo] = useState<ModoVentas>("dia");
  const [agrupMerc, setAgrupMerc] = useState<Agrupacion>("semana");
  const [desde, setDesde] = useState(restarDias(hoy, 30));
  const [hasta, setHasta] = useState(hoy);
  const [dia, setDia] = useState(hoy);
  const [exportando, setExportando] = useState(false);
  const [errorExp, setErrorExp] = useState<string | null>(null);

  const diario = seccion === "ventas" && modo === "dia";
  const d1 = diario ? dia : desde;
  const d2 = diario ? dia : hasta;
  const valido = /^\d{4}-\d{2}-\d{2}$/.test(d1) && /^\d{4}-\d{2}-\d{2}$/.test(d2) && d1 <= d2;
  const agrupacion: Agrupacion = seccion === "ventas" ? (modo === "dia" ? "mes" : modo) : agrupMerc;

  async function exportar() {
    setExportando(true);
    setErrorExp(null);
    try {
      await exportarReporte(seccion, d1, d2, agrupacion);
    } catch (e) {
      console.error(e);
      setErrorExp(e instanceof ApiError ? e.message : "No pudimos generar el archivo.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="max-w-5xl">
      <h1 className="font-serif text-[26px] font-semibold">Reportes</h1>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <p className="mb-6 text-[#8A8272]">Ventas y ganancia, movimiento de mercancía y lo pagado a proveedores. Todo se puede descargar en Excel.</p>

      <div role="tablist" aria-label="Secciones del reporte" className="mb-4 flex flex-wrap gap-2 border-b border-piedra-oscura">
        {SECCIONES.map(([v, l]) => (
          <button key={v} role="tab" type="button" aria-selected={seccion === v} onClick={() => setSeccion(v)} className={clsx("-mb-px border-b-2 px-4 py-2 text-sm font-medium", seccion === v ? "border-dorado-oscuro text-negro" : "border-transparent text-[#8A8272] hover:text-negro")}>{l}</button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4 bg-white p-4">
        {diario ? (
          <div className="flex items-end gap-2">
            <label className="text-sm">Día
              <input type="date" value={dia} max={hoy} onChange={(e) => setDia(e.target.value)} className="mt-1 block rounded-sm border border-piedra-oscura px-2 py-1.5" />
            </label>
            <button type="button" className={boton(false)} onClick={() => setDia(hoy)}>Hoy</button>
            <button type="button" className={boton(false)} onClick={() => setDia(restarDias(dia, 1))}>← Anterior</button>
          </div>
        ) : (
          <>
            <label className="text-sm">Desde
              <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} className="mt-1 block rounded-sm border border-piedra-oscura px-2 py-1.5" />
            </label>
            <label className="text-sm">Hasta
              <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} className="mt-1 block rounded-sm border border-piedra-oscura px-2 py-1.5" />
            </label>
            <div className="flex flex-wrap gap-2">
              {ATAJOS.map(([l, f]) => (
                <button key={l} type="button" onClick={() => { setDesde(f(hoy)); setHasta(hoy); }} className={boton(false)}>{l}</button>
              ))}
            </div>
          </>
        )}
        {seccion === "ventas" && (
          <div role="group" aria-label="Agrupación" className="flex flex-wrap gap-2">
            {MODOS_VENTAS.map(([v, l]) => <button key={v} type="button" aria-pressed={modo === v} onClick={() => setModo(v)} className={boton(modo === v)}>{l}</button>)}
          </div>
        )}
        {seccion === "mercancia" && (
          <div role="group" aria-label="Agrupación" className="flex flex-wrap gap-2">
            {MODOS_MERCANCIA.map(([v, l]) => <button key={v} type="button" aria-pressed={agrupMerc === v} onClick={() => setAgrupMerc(v)} className={boton(agrupMerc === v)}>{l}</button>)}
          </div>
        )}
        <button type="button" onClick={exportar} disabled={!valido || exportando} className="ml-auto rounded-sm bg-negro px-4 py-2 text-sm text-texto-claro disabled:opacity-50">
          {exportando ? "Generando…" : "Descargar Excel"}
        </button>
      </div>
      {errorExp && <p role="alert" className="mb-4 text-vino">{errorExp}</p>}

      {!valido ? (
        <p role="alert" className="text-vino">Revisa las fechas: «Desde» no puede ser posterior a «Hasta».</p>
      ) : seccion === "ventas" ? (
        <SeccionVentas modo={modo} desde={d1} hasta={d2} />
      ) : seccion === "mercancia" ? (
        <SeccionMercancia desde={d1} hasta={d2} agrupacion={agrupMerc} />
      ) : (
        <SeccionProveedores desde={d1} hasta={d2} />
      )}
    </div>
  );
}
