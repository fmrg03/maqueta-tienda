"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { agruparPorDia, etiquetaHora } from "@/lib/asesorias/asesorias";
import {
  agendaAsesor,
  agregarHorarios,
  DIAS_SEMANA,
  eliminarHorario,
  generarFechasHora,
  MAX_LOTE,
  type FranjaAgenda,
} from "@/lib/panel/asesores";

const hoyCaracas = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(new Date());
const campo = "rounded-sm border border-piedra-oscura bg-white px-3 py-2 text-sm";

export function HorariosAsesor({ asesorId, onCambio }: { asesorId: string; onCambio: () => void }) {
  const [agenda, setAgenda] = useState<FranjaAgenda[] | null>(null);
  const [errorAgenda, setErrorAgenda] = useState(false);
  const [desde, setDesde] = useState(hoyCaracas);
  const [hasta, setHasta] = useState(hoyCaracas);
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFin, setHoraFin] = useState("12:00");
  const [cadaMin, setCadaMin] = useState(60);
  const [creando, setCreando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const cargar = useCallback(() => {
    agendaAsesor(asesorId)
      .then((a) => {
        setAgenda(a);
        setErrorAgenda(false);
      })
      .catch(() => setErrorAgenda(true));
  }, [asesorId]);

  useEffect(() => {
    let vigente = true;
    agendaAsesor(asesorId)
      .then((a) => vigente && setAgenda(a))
      .catch(() => vigente && setErrorAgenda(true));
    return () => {
      vigente = false;
    };
  }, [asesorId]);

  const plan = useMemo(() => generarFechasHora({ desde, hasta, dias, horaInicio, horaFin, cadaMin }), [desde, hasta, dias, horaInicio, horaFin, cadaMin]);
  const rangoMalo = desde > hasta || horaInicio >= horaFin;
  const demasiados = plan.length > MAX_LOTE;

  async function crear() {
    setCreando(true);
    setAviso(null);
    try {
      const r = await agregarHorarios(asesorId, plan);
      setAviso({
        ok: true,
        texto: `Listo: ${r.creadas} ${r.creadas === 1 ? "horario creado" : "horarios creados"}${r.omitidas ? ` (${r.omitidas} ya existían)` : ""}.`,
      });
      cargar();
      onCambio();
    } catch (e) {
      setAviso({ ok: false, texto: e instanceof ApiError ? e.message : "No pudimos crear los horarios. Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      setCreando(false);
    }
  }

  async function quitar(f: FranjaAgenda) {
    setAviso(null);
    try {
      await eliminarHorario(f.id);
      cargar();
      onCambio();
    } catch (e) {
      setAviso({ ok: false, texto: e instanceof ApiError ? e.message : "No pudimos quitar el horario." });
    }
  }

  const grupos = useMemo(() => agruparPorDia((agenda ?? []).map((f) => ({ id: f.id, fechaHora: f.fechaHora }))), [agenda]);
  const porId = useMemo(() => new Map((agenda ?? []).map((f) => [f.id, f])), [agenda]);

  return (
    <section>
      <h2 className="mb-3 font-serif text-xl font-semibold">Horarios</h2>

      <div className="mb-6 bg-white p-4">
        <h3 className="mb-3 text-sm font-medium">Agregar horarios</h3>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="h-desde" className="text-xs text-[#8A8272]">Desde el día</label>
            <input id="h-desde" type="date" value={desde} min={hoyCaracas()} onChange={(e) => { setDesde(e.target.value); if (e.target.value > hasta) setHasta(e.target.value); }} className={campo} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="h-hasta" className="text-xs text-[#8A8272]">Hasta el día</label>
            <input id="h-hasta" type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} className={campo} />
          </div>
        </div>
        <fieldset className="mb-3">
          <legend className="mb-1 text-xs text-[#8A8272]">Días de la semana</legend>
          <div className="flex flex-wrap gap-2">
            {DIAS_SEMANA.map((d) => (
              <label key={d.n} className={clsx("cursor-pointer rounded-sm border px-3 py-1.5 text-sm", dias.includes(d.n) ? "border-negro bg-negro text-texto-claro" : "border-piedra-oscura bg-white hover:border-negro")}>
                <input type="checkbox" className="sr-only" checked={dias.includes(d.n)} onChange={() => setDias((x) => (x.includes(d.n) ? x.filter((n) => n !== d.n) : [...x, d.n]))} />
                {d.corto}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="h-ini" className="text-xs text-[#8A8272]">Primera llamada</label>
            <input id="h-ini" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className={campo} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="h-fin" className="text-xs text-[#8A8272]">Hasta las</label>
            <input id="h-fin" type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className={campo} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="h-cada" className="text-xs text-[#8A8272]">Una llamada cada</label>
            <select id="h-cada" value={cadaMin} onChange={(e) => setCadaMin(Number(e.target.value))} className={campo}>
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={45}>45 minutos</option>
              <option value={60}>1 hora</option>
              <option value={90}>1 hora y media</option>
              <option value={120}>2 horas</option>
            </select>
          </div>
        </div>
        <p className="mb-3 text-xs text-[#8A8272]">Hora de Venezuela. Ejemplo: de 9:00 a 12:00 cada hora crea las llamadas de 9:00, 10:00 y 11:00.</p>
        <p className="mb-3 text-sm" aria-live="polite">
          {rangoMalo ? <span className="text-vino">Revisa las fechas y horas: el final debe ser posterior al inicio.</span>
            : dias.length === 0 ? <span className="text-vino">Elige al menos un día de la semana.</span>
            : demasiados ? <span className="text-vino">Son demasiados horarios ({plan.length}); crea máximo {MAX_LOTE} por vez (acorta el rango de días).</span>
            : plan.length === 0 ? <span className="text-[#8A8272]">Con estas opciones no hay horarios por crear.</span>
            : <>Se crearán <strong>{plan.length}</strong> {plan.length === 1 ? "horario" : "horarios"}.</>}
        </p>
        <Button type="button" disabled={creando || rangoMalo || plan.length === 0 || demasiados} onClick={crear}>{creando ? "Creando…" : "Crear horarios"}</Button>
        {aviso && <p role={aviso.ok ? "status" : "alert"} className={clsx("mt-3 text-sm", aviso.ok ? "text-esmeralda" : "text-vino")}>{aviso.texto}</p>}
      </div>

      <h3 className="mb-2 text-sm font-medium">Agenda</h3>
      {errorAgenda && <p role="alert" className="text-vino">No pudimos cargar la agenda. Intenta de nuevo.</p>}
      {!agenda && !errorAgenda && <p className="text-[#8A8272]">Cargando…</p>}
      {agenda && grupos.length === 0 && <p className="bg-white p-4 text-sm text-[#8A8272]">Todavía no hay horarios. Los clientes no podrán elegir a este asesor hasta que agregues algunos.</p>}
      {grupos.length > 0 && (
        <>
          <p className="mb-3 flex flex-wrap gap-x-4 text-xs text-[#8A8272]">
            <span><span className="mr-1 inline-block h-2.5 w-2.5 border border-negro bg-white align-middle" />Libre</span>
            <span><span className="mr-1 inline-block h-2.5 w-2.5 bg-dorado-oscuro align-middle" />Reservada por un cliente</span>
          </p>
          <ul className="divide-y divide-piedra-oscura bg-white">
            {grupos.map((g) => (
              <li key={g.dia} className="flex flex-wrap items-start gap-x-4 gap-y-2 p-3">
                <p className="w-44 shrink-0 text-sm font-medium">{g.etiqueta}</p>
                <div className="flex flex-wrap gap-2">
                  {g.franjas.map((fr) => {
                    const f = porId.get(fr.id)!;
                    return f.disponible ? (
                      <span key={f.id} className="inline-flex items-center gap-1.5 rounded-sm border border-negro bg-white py-1 pl-2.5 pr-1.5 font-mono text-sm">
                        {etiquetaHora(f.fechaHora)}
                        <button type="button" aria-label={`Quitar horario de las ${etiquetaHora(f.fechaHora)} del ${g.etiqueta}`} onClick={() => quitar(f)} className="px-1 text-[#8A8272] hover:text-vino">×</button>
                      </span>
                    ) : (
                      <span key={f.id} className="inline-flex items-center gap-2 rounded-sm bg-dorado-oscuro px-2.5 py-1 text-sm text-white">
                        <span className="font-mono">{etiquetaHora(f.fechaHora)}</span>
                        {f.solicitudId ? <Link href={`/panel/asesorias/${f.solicitudId}`} className="underline">{f.clienteNombre}</Link> : <span>{f.clienteNombre ?? "reservada"}</span>}
                      </span>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
