"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api/client";
import {
  cancelarSolicitud,
  cerrarVenta,
  dinero,
  ETIQUETA_METODO,
  type MetodoPago,
  type Solicitud,
} from "@/lib/panel/carrito";

function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: React.ReactNode }) {
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
        className="max-h-full w-full max-w-md overflow-y-auto bg-piedra p-6 outline-none"
      >
        <h2 className="mb-4 font-serif text-xl font-semibold">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

const msg = (e: unknown) =>
  e instanceof ApiError ? e.message : "No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.";

export function DialogoCierre({
  solicitud,
  total,
  onCerrar,
  onResultado,
}: {
  solicitud: Solicitud;
  total: number;
  onCerrar: () => void;
  onResultado: (s: Solicitud) => void;
}) {
  const [metodo, setMetodo] = useState<MetodoPago>(solicitud.metodoPago ?? "pago_movil");
  const [referencia, setReferencia] = useState(solicitud.referenciaPago ?? "");
  const [monto, setMonto] = useState((solicitud.montoCobrado ?? total).toFixed(2));
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    const m = Number(monto);
    if (monto.trim() === "" || Number.isNaN(m) || m < 0) {
      setError("Escribe el monto realmente cobrado.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      onResultado(await cerrarVenta(solicitud.id, { metodoPago: metodo, referenciaPago: referencia.trim() || undefined, montoCobrado: m }));
    } catch (e) {
      console.error(e);
      setError(msg(e));
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Cerrar venta" onCerrar={onCerrar}>
      <p className="mb-4 text-sm text-[#4A4538]">
        Confirma que el pago ya fue verificado. Al cerrar se descuenta el inventario y el monto cobrado cuenta como ingreso.
        Si falta mercancía no se descuenta nada y la venta queda pendiente por stock.
      </p>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="metodo" className="text-sm font-medium">Método de pago</label>
          <select
            id="metodo"
            value={metodo}
            onChange={(e) => setMetodo(e.target.value as MetodoPago)}
            className="rounded-sm border border-piedra-oscura bg-white px-3 py-2.5 text-sm"
          >
            {Object.entries(ETIQUETA_METODO).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <Input label="Referencia del pago (opcional)" name="referencia" value={referencia} maxLength={100} onChange={(e) => setReferencia(e.target.value)} />
        <Input label={`Monto cobrado (total del pedido ${dinero(total)})`} name="monto" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-vino">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <Button variante="secundario" onClick={onCerrar} disabled={enviando}>Volver</Button>
        <Button onClick={confirmar} disabled={enviando}>{enviando ? "Cerrando…" : "Confirmar cierre"}</Button>
      </div>
    </Modal>
  );
}

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
  const huboPago = anulacion || solicitud.estado === "pendiente_stock";
  const [motivo, setMotivo] = useState("");
  const [reembolso, setReembolso] = useState(huboPago && solicitud.montoCobrado !== null ? solicitud.montoCobrado.toFixed(2) : "");
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
