"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/Badge";
import { ApiError } from "@/lib/api/client";
import { getUsuarioSesion, suscribirSesion } from "@/lib/auth/auth";
import {
  enlaceWhatsAppCliente,
  ETIQUETA_ESTADO,
  fechaCorta,
  historialSolicitud,
  obtenerSolicitud,
  TONO_ESTADO,
  type Evento,
  type Solicitud,
} from "@/lib/panel/carrito";
import { EditorPedido, type Aviso } from "./EditorPedido";
import { HistorialSolicitud } from "./HistorialSolicitud";

export function DetalleSolicitud({ id }: { id: string }) {
  const usuario = useSyncExternalStore(suscribirSesion, getUsuarioSesion, () => null);
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const cargarHistorial = useCallback(() => {
    historialSolicitud(id).then(setEventos).catch(() => setEventos([]));
  }, [id]);

  useEffect(() => {
    let vigente = true;
    obtenerSolicitud(id)
      .then((s) => vigente && setSolicitud(s))
      .catch((e) => {
        if (!vigente) return;
        setError(e instanceof ApiError && e.statusCode === 404 ? "No encontramos esta solicitud." : "No pudimos cargarla. Intenta de nuevo.");
      });
    cargarHistorial();
    return () => {
      vigente = false;
    };
  }, [id, cargarHistorial]);

  function actualizada(s: Solicitud, nuevoAviso?: Aviso) {
    setSolicitud(s);
    setAviso(nuevoAviso ?? null);
    cargarHistorial();
  }

  if (error)
    return (
      <div className="max-w-md">
        <p role="alert" className="text-vino">{error}</p>
        <Link href="/panel/carrito" className="mt-3 inline-block underline">Volver a solicitudes</Link>
      </div>
    );
  if (!solicitud || !usuario) return <p className="text-[#8A8272]">Cargando…</p>;

  return (
    <div className="max-w-4xl">
      <Link href="/panel/carrito" className="text-sm underline">← Solicitudes</Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-[26px] font-semibold">{solicitud.clienteNombre}</h1>
          <p className="mt-1 font-mono text-xs text-[#8A8272]">
            Recibida {fechaCorta(solicitud.createdAt)} · {solicitud.canalEnvio}
          </p>
        </div>
        <Badge tono={TONO_ESTADO[solicitud.estado]}>{ETIQUETA_ESTADO[solicitud.estado]}</Badge>
      </div>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />

      <dl className="mb-6 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="text-[#8A8272]">WhatsApp</dt>
          <dd>
            <a
              href={enlaceWhatsAppCliente(solicitud.clienteTelefono)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono underline"
            >
              {solicitud.clienteTelefono}
            </a>
          </dd>
        </div>
        {solicitud.clienteEmail && (
          <div className="flex gap-2">
            <dt className="text-[#8A8272]">Correo</dt>
            <dd className="font-mono">{solicitud.clienteEmail}</dd>
          </div>
        )}
      </dl>

      {aviso && (
        <p role="status" className="mb-4 border-l-4 border-esmeralda bg-white px-3 py-2 text-sm">
          {aviso.texto}
          {aviso.enlace && (
            <>
              {" "}
              <a href={aviso.enlace} target="_blank" rel="noopener noreferrer" className="underline">
                Abrir WhatsApp
              </a>
            </>
          )}
        </p>
      )}

      {/* key: al guardar o recargar, el editor se reinicia con los datos del servidor */}
      <EditorPedido
        key={`${solicitud.id}-${solicitud.estado}-${JSON.stringify(solicitud.items.map((i) => [i.id, i.cantidad, i.precioUnitario]))}-${solicitud.totalFinal}-${solicitud.modificadaDesdeEnvio}`}
        solicitud={solicitud}
        esAdmin={usuario.rol === "admin"}
        onActualizada={actualizada}
      />

      <HistorialSolicitud eventos={eventos} />
    </div>
  );
}
