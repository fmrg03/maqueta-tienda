"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { DialogoReagendar } from "./DialogoReagendar";
import { enlaceWhatsAppCliente } from "@/lib/panel/carrito";
import {
  ejecutarAccion,
  ESTADOS_ABIERTOS_ASESORIA,
  ETIQUETA_ESTADO_ASESORIA,
  fechaLlamada,
  obtenerAsesoria,
  TONO_ESTADO_ASESORIA,
  type AccionAsesoria,
  type RespuestaReagendar,
  type SolicitudAsesoria,
} from "@/lib/panel/asesorias";

const PASOS = ["Pendiente", "Llamada realizada", "Resultado"] as const;

function pasoActual(s: SolicitudAsesoria["estado"]): number {
  if (s === "pendiente") return 0;
  if (s === "llamada_realizada") return 1;
  return 2;
}

export function DetalleAsesoria({ id }: { id: string }) {
  const [s, setS] = useState<SolicitudAsesoria | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notas, setNotas] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [confirmaCancelar, setConfirmaCancelar] = useState(false);
  const [reagendando, setReagendando] = useState(false);
  const [aviso, setAviso] = useState<RespuestaReagendar | null>(null);

  useEffect(() => {
    let vigente = true;
    obtenerAsesoria(id)
      .then((r) => {
        if (!vigente) return;
        setS(r);
        setNotas(r.notasLlamada ?? "");
      })
      .catch((e) => vigente && setError(e instanceof ApiError && e.statusCode === 404 ? "No encontramos esta asesoría." : "No pudimos cargarla. Intenta de nuevo."));
    return () => {
      vigente = false;
    };
  }, [id]);

  async function accion(a: AccionAsesoria) {
    setOcupado(true);
    setFallo(null);
    try {
      const r = await ejecutarAccion(id, a, notas);
      setS(r);
      setNotas(r.notasLlamada ?? "");
      setConfirmaCancelar(false);
    } catch (e) {
      setFallo(e instanceof ApiError ? e.message : "No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  if (error)
    return (
      <div className="max-w-md">
        <p role="alert" className="text-vino">{error}</p>
        <Link href="/panel/asesorias" className="mt-3 inline-block underline">Volver a asesorías</Link>
      </div>
    );
  if (!s) return <p className="text-[#8A8272]">Cargando…</p>;

  const abierta = ESTADOS_ABIERTOS_ASESORIA.includes(s.estado);
  const cancelada = s.estado === "cancelada";
  const paso = pasoActual(s.estado);
  const mensaje = `Hola ${s.clienteNombre}, te escribimos de Revestimiento Élite RY por la asesoría que agendaste.`;

  return (
    <div className="max-w-3xl">
      <Link href="/panel/asesorias" className="text-sm underline">← Asesorías</Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-[26px] font-semibold">{s.clienteNombre}</h1>
          <p className="mt-1 text-sm capitalize text-[#8A8272]">Llamada: {fechaLlamada(s.fechaHoraLlamada)}</p>
        </div>
        <Badge tono={TONO_ESTADO_ASESORIA[s.estado]}>{ETIQUETA_ESTADO_ASESORIA[s.estado]}</Badge>
      </div>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />

      <ol className="mb-6 flex flex-wrap gap-x-6 gap-y-1 text-sm" aria-label="Avance">
        {PASOS.map((p, i) => (
          <li key={p} aria-current={i === paso && !cancelada ? "step" : undefined} className={clsx("flex items-center gap-2", i === paso && !cancelada ? "font-semibold" : "text-[#8A8272]")}>
            <span className={clsx("flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs", i < paso && !cancelada ? "bg-esmeralda text-white" : i === paso && !cancelada ? "bg-negro text-texto-claro" : "border border-piedra-oscura")}>
              {i < paso && !cancelada ? "✓" : i + 1}
            </span>
            {i === 2 && paso === 2 && !cancelada ? ETIQUETA_ESTADO_ASESORIA[s.estado] : p}
          </li>
        ))}
      </ol>

      <section className="mb-6 bg-white p-4">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div><dt className="text-[#8A8272]">Teléfono</dt><dd className="font-mono">{s.clienteTelefono}</dd></div>
          <div><dt className="text-[#8A8272]">Correo</dt><dd>{s.clienteEmail || "—"}</dd></div>
          <div><dt className="text-[#8A8272]">Asesor</dt><dd>{s.asesor?.usuario?.nombre ?? "—"}</dd></div>
        </dl>
        <a
          href={enlaceWhatsAppCliente(s.clienteTelefono, mensaje)}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block rounded-sm border border-negro px-4 py-2 text-sm font-medium hover:bg-negro hover:text-texto-claro"
        >
          Abrir WhatsApp del cliente ↗
        </a>
      </section>

      <section className="mb-6">
        <label htmlFor="notas" className="mb-1 block text-sm font-medium">Notas de la llamada</label>
        {abierta ? (
          <textarea
            id="notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Qué necesita el cliente, qué quedó acordado…"
            className="w-full border border-piedra-oscura bg-white p-3 text-sm focus:outline focus:outline-2 focus:outline-dorado"
          />
        ) : (
          <p className="whitespace-pre-wrap bg-white p-3 text-sm">{s.notasLlamada || "Sin notas."}</p>
        )}
      </section>

      {aviso && (
        <div role="status" className="mb-4 border-l-4 border-esmeralda bg-white p-3 text-sm">
          <p className="font-medium">Llamada reagendada para el {fechaLlamada(aviso.solicitud.fechaHoraLlamada)}.</p>
          <p className="mt-1 text-[#4A4538]">
            {aviso.emailEnviado
              ? "Le enviamos el aviso por correo al cliente."
              : "No se envió correo (el cliente no dejó uno o el envío no está configurado)."}
          </p>
          <a
            href={enlaceWhatsAppCliente(aviso.solicitud.clienteTelefono, aviso.texto)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block underline"
          >
            Avisarle también por WhatsApp ↗
          </a>
        </div>
      )}

      {fallo && <p role="alert" className="mb-3 text-vino">{fallo}</p>}

      {abierta && (
        <div className="flex flex-wrap items-center gap-3">
          {s.estado === "pendiente" && (
            <>
              <Button disabled={ocupado} onClick={() => accion("registrar-llamada")}>Registrar llamada realizada</Button>
              <Button variante="secundario" disabled={ocupado} onClick={() => setReagendando(true)}>Reagendar</Button>
            </>
          )}
          {s.estado === "llamada_realizada" && (
            <>
              <Button disabled={ocupado} onClick={() => accion("marcar-visita-pactada")}>Se pactó una visita</Button>
              <Button variante="secundario" disabled={ocupado} onClick={() => accion("marcar-no-procede")}>No procede</Button>
            </>
          )}
          {!confirmaCancelar ? (
            <button className="text-sm underline" onClick={() => setConfirmaCancelar(true)}>Cancelar asesoría</button>
          ) : (
            <span className="flex items-center gap-3 text-sm">
              ¿Cancelar? La franja quedará libre para otro cliente.
              <button className="font-semibold text-vino underline" disabled={ocupado} onClick={() => accion("cancelar")}>Sí, cancelar</button>
              <button className="underline" onClick={() => setConfirmaCancelar(false)}>No</button>
            </span>
          )}
        </div>
      )}

      {reagendando && (
        <DialogoReagendar
          solicitud={s}
          onCerrar={() => setReagendando(false)}
          onListo={(r) => {
            setS(r.solicitud);
            setAviso(r);
            setReagendando(false);
          }}
        />
      )}
    </div>
  );
}
