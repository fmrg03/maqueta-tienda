"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { actualizarAsesor, obtenerAsesorAdmin, type AsesorAdmin } from "@/lib/panel/asesores";
import { HorariosAsesor } from "./HorariosAsesor";

export function DetalleAsesor({ id, recienCreado }: { id: string; recienCreado: boolean }) {
  const [a, setA] = useState<AsesorAdmin | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [especialidad, setEspecialidad] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [confirma, setConfirma] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const recargar = useCallback(() => {
    obtenerAsesorAdmin(id)
      .then((r) => setA(r))
      .catch(() => setError("No pudimos cargar el asesor. Intenta de nuevo."));
  }, [id]);

  useEffect(() => {
    let vigente = true;
    obtenerAsesorAdmin(id)
      .then((r) => {
        if (!vigente) return;
        setA(r);
        setEspecialidad(r?.especialidad ?? "");
      })
      .catch(() => vigente && setError("No pudimos cargar el asesor. Intenta de nuevo."));
    return () => {
      vigente = false;
    };
  }, [id]);

  async function cambiar(datos: { especialidad?: string; activo?: boolean }, mensaje: string) {
    setOcupado(true);
    setFallo(null);
    setAviso(null);
    try {
      await actualizarAsesor(id, datos);
      setAviso(mensaje);
      setConfirma(false);
      recargar();
    } catch (e) {
      setFallo(e instanceof ApiError ? e.message : "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  if (error) return <div><p role="alert" className="text-vino">{error}</p><Link href="/panel/asesores" className="mt-3 inline-block underline">Volver a asesores</Link></div>;
  if (a === undefined) return <p className="text-[#8A8272]">Cargando…</p>;
  if (a === null) return <div><p role="alert" className="text-vino">No encontramos este asesor.</p><Link href="/panel/asesores" className="mt-3 inline-block underline">Volver a asesores</Link></div>;

  return (
    <div className="max-w-4xl">
      <Link href="/panel/asesores" className="text-sm underline">← Asesores</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-[26px] font-semibold">{a.nombre}</h1>
          <p className="mt-1 font-mono text-xs text-[#8A8272]">{a.email}{a.telefono && ` · ${a.telefono}`}</p>
        </div>
        {!a.activo && <Badge>inactivo</Badge>}
      </div>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />

      {recienCreado && (
        <p role="status" className="mb-5 border-l-4 border-esmeralda bg-white p-3 text-sm">
          Asesor creado. Ahora agrégale horarios abajo para que los clientes puedan elegirlo.
        </p>
      )}

      <section className="mb-8 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[14rem] flex-1 flex-col gap-1">
            <label htmlFor="esp" className="text-sm font-medium">Especialidad (la ve el cliente)</label>
            <input id="esp" value={especialidad} maxLength={150} onChange={(e) => setEspecialidad(e.target.value)} className="rounded-sm border border-piedra-oscura px-3 py-2 text-sm" />
          </div>
          <Button type="button" variante="secundario" disabled={ocupado || especialidad.trim() === (a.especialidad ?? "")} onClick={() => cambiar({ especialidad: especialidad.trim() }, "Especialidad guardada.")}>Guardar</Button>
        </div>
        <div className="mt-4 border-t border-piedra-oscura pt-4 text-sm">
          {a.activo ? (
            !confirma ? (
              <button type="button" className="underline" onClick={() => setConfirma(true)}>Desactivar asesor</button>
            ) : (
              <span className="flex flex-wrap items-center gap-3">
                Los clientes dejarán de verlo (sus asesorías ya agendadas se conservan).
                <button type="button" disabled={ocupado} className="font-semibold text-vino underline" onClick={() => cambiar({ activo: false }, "Asesor desactivado.")}>Sí, desactivar</button>
                <button type="button" className="underline" onClick={() => setConfirma(false)}>No</button>
              </span>
            )
          ) : (
            <button type="button" disabled={ocupado} className="underline" onClick={() => cambiar({ activo: true }, "Asesor activado.")}>Activar asesor</button>
          )}
        </div>
        {aviso && <p role="status" className="mt-3 text-sm text-esmeralda">{aviso}</p>}
        {fallo && <p role="alert" className="mt-3 text-sm text-vino">{fallo}</p>}
      </section>

      <HorariosAsesor asesorId={a.id} onCambio={recargar} />
    </div>
  );
}
