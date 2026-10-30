"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api/client";
import { formatoBs, useDescuentoDivisas, useTasaBcv } from "@/lib/tasas/tasas";
import {
  cancelarSolicitud,
  cerrarVenta,
  dinero,
  ETIQUETA_METODO,
  calcularCobroPreview,
  METODOS_DIVISAS,
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
  const tasaVigente = useTasaBcv();
  const porcentaje = useDescuentoDivisas();

  const [metodo, setMetodo] = useState<MetodoPago>(solicitud.metodoPago ?? "pago_movil");
  const [referencia, setReferencia] = useState(solicitud.referenciaPago ?? "");
  const [aplicarDescuento, setAplicarDescuento] = useState(true);
  // null = usar la tasa vigente (o la ya registrada en un cierre anterior)
  const [tasaTexto, setTasaTexto] = useState<string | null>(null);
  const [montoTexto, setMontoTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const tasaBase = solicitud.tasaBcv ?? tasaVigente?.valor ?? null;
  const tasaMostrada = tasaTexto ?? (tasaBase !== null ? String(tasaBase) : "");
  const tasaNum = tasaMostrada.trim() === "" ? null : Number(tasaMostrada.replace(",", "."));
  const tasaValida = tasaNum !== null && !Number.isNaN(tasaNum) && tasaNum > 0 ? tasaNum : null;
  const montoManual = montoTexto.trim() === "" ? null : Number(montoTexto.replace(",", "."));
  const montoInvalido = montoManual !== null && (Number.isNaN(montoManual) || montoManual < 0);

  const esDivisas = METODOS_DIVISAS.includes(metodo);
  const vista = calcularCobroPreview({
    base: total,
    metodo,
    aplicarDescuento,
    porcentaje,
    montoManual: montoInvalido ? null : montoManual,
    tasa: tasaValida,
  });

  async function confirmar() {
    if (montoInvalido) {
      setError("El monto manual no es válido.");
      return;
    }
    if (tasaValida === null) {
      setError("No hay tasa BCV disponible. Escríbela en el campo de tasa o fíjala en Configuración.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      onResultado(
        await cerrarVenta(solicitud.id, {
          metodoPago: metodo,
          referenciaPago: referencia.trim() || undefined,
          montoCobrado: montoManual ?? undefined,
          aplicarDescuento: esDivisas ? aplicarDescuento : undefined,
          tasaBcv: tasaTexto !== null || solicitud.tasaBcv !== null ? tasaValida : undefined,
        }),
      );
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

        {esDivisas && porcentaje > 0 && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={aplicarDescuento} onChange={(e) => setAplicarDescuento(e.target.checked)} className="mt-1" />
            <span>
              Aplicar descuento por pago en divisas (<strong>{porcentaje.toLocaleString("es-VE")}%</strong>)
            </span>
          </label>
        )}

        <Input label="Referencia del pago (opcional)" name="referencia" value={referencia} maxLength={100} onChange={(e) => setReferencia(e.target.value)} />
        <Input label="Tasa BCV (Bs por USD)" name="tasa" inputMode="decimal" value={tasaMostrada} placeholder="Sin tasa: escríbela" onChange={(e) => setTasaTexto(e.target.value)} />
        <Input label="Ajustar monto cobrado (opcional)" name="monto" inputMode="decimal" value={montoTexto} placeholder={vista.monto.toFixed(2)} onChange={(e) => setMontoTexto(e.target.value)} />

        <dl className="space-y-1 border-t border-piedra-oscura pt-3 font-mono text-sm">
          <div className="flex justify-between"><dt>Total del pedido</dt><dd>{dinero(total)}</dd></div>
          {vista.descuentoMonto !== null && (
            <div className="flex justify-between text-esmeralda"><dt>Descuento {porcentaje.toLocaleString("es-VE")}%</dt><dd>−{dinero(vista.descuentoMonto)}</dd></div>
          )}
          <div className="flex justify-between text-base font-semibold"><dt>A cobrar</dt><dd>{dinero(vista.monto)}</dd></div>
          {vista.montoBs !== null && tasaValida !== null && (
            <div className="flex justify-between text-[#8A8272]"><dt>En bolívares</dt><dd>{formatoBs(vista.monto, tasaValida)}</dd></div>
          )}
        </dl>
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
