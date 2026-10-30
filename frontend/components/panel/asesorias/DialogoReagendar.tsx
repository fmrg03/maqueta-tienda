"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/panel/carrito/Dialogos";
import { ApiError } from "@/lib/api/client";
import { agruparPorDia, etiquetaHora, listarFranjas, type Franja } from "@/lib/asesorias/asesorias";
import { reagendarAsesoria, type RespuestaReagendar, type SolicitudAsesoria } from "@/lib/panel/asesorias";

const chip = (activo: boolean) =>
  clsx(
    "cursor-pointer rounded-sm border px-3 py-2 text-sm transition-colors",
    activo ? "border-negro bg-negro text-texto-claro" : "border-piedra-oscura bg-white hover:border-negro",
  );

export function DialogoReagendar({
  solicitud,
  onCerrar,
  onListo,
}: {
  solicitud: SolicitudAsesoria;
  onCerrar: () => void;
  onListo: (r: RespuestaReagendar) => void;
}) {
  const [franjas, setFranjas] = useState<Franja[] | null>(null);
  const [dia, setDia] = useState("");
  const [elegida, setElegida] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const asesorId = solicitud.asesor?.id;

  useEffect(() => {
    let vigente = true;
    if (!asesorId) return;
    listarFranjas(asesorId)
      .then((f) => vigente && setFranjas(f))
      .catch(() => vigente && setError("No pudimos cargar los horarios libres. Intenta de nuevo."));
    return () => {
      vigente = false;
    };
  }, [asesorId]);

  const dias = useMemo(() => agruparPorDia(franjas ?? []), [franjas]);
  const horas = dias.find((d) => d.dia === dia)?.franjas ?? [];

  async function confirmar() {
    if (!elegida) return setError("Elige un día y una hora.");
    setEnviando(true);
    setError(null);
    try {
      onListo(await reagendarAsesoria(solicitud.id, elegida));
    } catch (e) {
      if (e instanceof ApiError && e.statusCode === 409 && asesorId) {
        setError("Ese horario acaba de ser reservado por otra persona. Elige otro.");
        setElegida("");
        listarFranjas(asesorId).then(setFranjas).catch(() => undefined);
      } else {
        setError(e instanceof ApiError ? e.message : "No pudimos reagendar. Revisa tu conexión e inténtalo de nuevo.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Reagendar llamada" onCerrar={onCerrar}>
      <p className="mb-4 text-sm text-[#4A4538]">
        Elige otro horario libre de {solicitud.asesor?.usuario?.nombre ?? "este asesor"}. Le avisaremos a {solicitud.clienteNombre} del cambio.
      </p>
      {!asesorId && <p className="text-sm text-vino">Esta asesoría no tiene asesor asignado.</p>}
      {asesorId && !franjas && !error && <p className="text-sm text-[#8A8272]">Cargando horarios…</p>}
      {franjas && franjas.length === 0 && <p className="text-sm text-[#8A8272]">No hay horarios libres. Agrega disponibilidad al asesor primero.</p>}
      {dias.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium">Día <span className="font-normal text-[#8A8272]">(hora de Venezuela)</span></p>
          <div className="mb-3 flex flex-wrap gap-2">
            {dias.map((d) => (
              <label key={d.dia} className={chip(d.dia === dia)}>
                <input type="radio" name="dia" className="sr-only" checked={d.dia === dia} onChange={() => { setDia(d.dia); setElegida(""); }} />
                {d.etiqueta}
              </label>
            ))}
          </div>
          {horas.length > 0 && (
            <>
              <p className="mb-2 text-sm font-medium">Hora</p>
              <div className="flex flex-wrap gap-2">
                {horas.map((h) => (
                  <label key={h.id} className={clsx(chip(h.fechaHora === elegida), "font-mono")}>
                    <input type="radio" name="hora" className="sr-only" checked={h.fechaHora === elegida} onChange={() => setElegida(h.fechaHora)} />
                    {etiquetaHora(h.fechaHora)}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {error && <p role="alert" className="mb-3 text-sm text-vino">{error}</p>}
      <div className="flex gap-3">
        <Button disabled={enviando || !asesorId} onClick={confirmar}>{enviando ? "Reagendando…" : "Confirmar cambio"}</Button>
        <Button variante="secundario" onClick={onCerrar} disabled={enviando}>Cancelar</Button>
      </div>
    </Modal>
  );
}
