"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api/client";
import {
  cancelarSolicitud,
  type Solicitud,
} from "@/lib/panel/carrito";

export const msgError = (e: unknown) =>
  e instanceof ApiError ? e.message : "No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.";

export function Modal({ titulo, onCerrar, children, ancho = "max-w-md" }: { titulo: string; onCerrar: () => void; children: React.ReactNode; ancho?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-negro/60 p-4" onClick={onCerrar}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className={`max-h-full w-full ${ancho} overflow-y-auto bg-piedra p-6 outline-none`}
      >
        <h2 className="mb-4 font-serif text-xl font-semibold">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

const msg = (e: unknown) =>
  e instanceof ApiError ? e.message : "No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.";

export function DialogoCancelar({
  solicitud,
  onCerrar,
  onResultado,
}: {
  solicitud: Solicitud;
  onCerrar: () => void;
  onResultado: (s: Solicitud) => void;
}) {
  const anulacion = solicitud.estado === "cerrada";
  const huboPago = anulacion || solicitud.pagos.length > 0;
  const [motivo, setMotivo] = useState("");
  const [reembolso, setReembolso] = useState(huboPago && solicitud.resumenCobro.recibido > 0 ? solicitud.resumenCobro.recibido.toFixed(2) : "");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    if (motivo.trim().length < 3) {
      setError("Cuéntanos el motivo.");
      return;
    }
    const r = reembolso.trim() === "" ? undefined : Number(reembolso);
    if (r !== undefined && (Number.isNaN(r) || r < 0)) {
      setError("El monto reembolsado no es válido.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      onResultado(await cancelarSolicitud(solicitud.id, { motivo: motivo.trim(), montoReembolsado: r }));
    } catch (e) {
      console.error(e);
      setError(msg(e));
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={anulacion ? "Anular venta" : "Cancelar solicitud"} onCerrar={onCerrar}>
      <p className="mb-4 text-sm text-[#4A4538]">
        {anulacion
          ? "La venta dejará de contar como ingreso y se repondrá el inventario descontado. Esta acción queda registrada."
          : "La solicitud se marcará como cancelada. No se modifica el inventario."}
      </p>
      <div className="flex flex-col gap-4">
        <Input label="Motivo" name="motivo" value={motivo} maxLength={300} onChange={(e) => setMotivo(e.target.value)} />
        {huboPago && (
          <Input label="Monto reembolsado al cliente (opcional)" name="reembolso" inputMode="decimal" value={reembolso} onChange={(e) => setReembolso(e.target.value)} />
        )}
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-vino">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <Button variante="secundario" onClick={onCerrar} disabled={enviando}>Volver</Button>
        <Button onClick={confirmar} disabled={enviando}>{enviando ? "Procesando…" : anulacion ? "Anular venta" : "Cancelar solicitud"}</Button>
      </div>
    </Modal>
  );
}
