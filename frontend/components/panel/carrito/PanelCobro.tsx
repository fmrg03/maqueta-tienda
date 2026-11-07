"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatoBs, useTasaBcv } from "@/lib/tasas/tasas";
import {
  cerrarVenta,
  dinero,
  eliminarPago,
  ESTADOS_ABIERTOS,
  ETIQUETA_METODO,
  fechaCorta,
  METODOS_BOLIVARES,
  METODOS_DIVISAS,
  prorrogarReserva,
  registrarPago,
  type MetodoPago,
  type Solicitud,
} from "@/lib/panel/carrito";
import { msgError } from "./Dialogos";

const aNumero = (t: string): number | null => {
  const n = Number(t.trim().replace(",", "."));
  return t.trim() === "" || Number.isNaN(n) ? null : n;
};

/** Cobros del pedido: totales BCV/divisas, abonos, saldo y reserva. */
export function PanelCobro({
  solicitud,
  bloqueo,
  onActualizada,
}: {
  solicitud: Solicitud;
  /** Motivo por el que ahora no se puede cobrar (cambios sin guardar/enviar…); null = se puede. */
  bloqueo: string | null;
  onActualizada: (s: Solicitud, aviso?: string) => void;
}) {
  const r = solicitud.resumenCobro;
  const abierta = ESTADOS_ABIERTOS.includes(solicitud.estado);
  const tasaVigente = useTasaBcv();
  const [metodo, setMetodo] = useState<MetodoPago>("pago_movil");
  const [monto, setMonto] = useState("");
  const [referencia, setReferencia] = useState("");
  const [tasaTexto, setTasaTexto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [dias, setDias] = useState("");

  const hayDivisas = r.divisas < r.bcv - 0.004;
  const esDivisas = METODOS_DIVISAS.includes(metodo);
  const esBs = METODOS_BOLIVARES.includes(metodo);
  const tasaNum = aNumero(tasaTexto ?? (tasaVigente ? String(tasaVigente.valor) : ""));
  const montoNum = aNumero(monto);
  const abonaVista = montoNum !== null ? Math.round((esDivisas && r.factor < 1 ? montoNum / r.factor : montoNum) * 100) / 100 : null;
  const hayPagos = solicitud.pagos.length > 0;
  const [ahora] = useState(() => Date.now());
  const vencida = solicitud.reservaVenceAt ? new Date(solicitud.reservaVenceAt).getTime() < ahora : false;

  async function ejecutar(nombre: string, fn: () => Promise<Solicitud>, aviso: (s: Solicitud) => string) {
    setOcupado(nombre);
    setError(null);
    try {
      const s = await fn();
      onActualizada(s, aviso(s));
      setMonto("");
      setReferencia("");
    } catch (e) {
      console.error(e);
      setError(msgError(e));
    } finally {
      setOcupado(null);
    }
  }

  function pagar() {
    if (montoNum === null || montoNum <= 0) return setError("Escribe el monto recibido en dólares.");
    if (esBs && !tasaNum) return setError("Falta la tasa BCV para pagos en bolívares.");
    void ejecutar(
      "pago",
      () => registrarPago(solicitud.id, { metodo, monto: montoNum, referencia: referencia.trim() || undefined, tasaBcv: esBs && tasaNum ? tasaNum : undefined }),
      (s) =>
        s.estado === "cerrada"
          ? "Pago registrado y pedido cubierto: venta cerrada, se descontó el inventario."
          : s.estado === "pendiente_stock"
            ? "Pago registrado, pero falta mercancía: quedó pendiente por stock."
            : "Pago registrado. La mercancía del pedido quedó reservada.",
    );
  }

  return (
    <section aria-labelledby="cobro" className="mt-8 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="cobro" className="font-serif text-lg font-semibold">Cobro</h2>
        {solicitud.estado === "reservada" && (
          <Badge tono={vencida ? "alerta" : "dorado"}>
            {vencida ? "Reserva vencida" : "Reservada"}
            {solicitud.reservaVenceAt ? ` · vence ${fechaCorta(solicitud.reservaVenceAt)}` : ""}
          </Badge>
        )}
      </div>

      <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-4">
          <dt className="text-[#8A8272]">{hayDivisas ? "Total en dólares BCV (Bs, pago móvil, transf.)" : "Total"}</dt>
          <dd className="font-mono">{dinero(r.bcv)}</dd>
        </div>
        {hayDivisas && (
          <div className="flex justify-between gap-4">
            <dt className="text-[#8A8272]">Total en divisas (efectivo USD, Zelle, Binance)</dt>
            <dd className="font-mono">{dinero(r.divisas)}</dd>
          </div>
        )}
      </dl>

      {solicitud.pagos.length > 0 && (
        <ul className="mt-4 divide-y divide-piedra-oscura border-y border-piedra-oscura text-sm">
          {solicitud.pagos.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <strong>{ETIQUETA_METODO[p.metodo] ?? p.metodo}</strong>
                {p.referencia && <span className="text-[#8A8272]"> · ref. {p.referencia}</span>}
                <span className="block font-mono text-xs text-[#8A8272]">
                  {fechaCorta(p.createdAt)}
                  {p.montoBs !== null && p.tasaBcv !== null && ` · ${formatoBs(p.monto, p.tasaBcv)} (tasa ${p.tasaBcv.toFixed(2)})`}
                </span>
              </span>
              <span className="flex items-center gap-3 font-mono">
                <span>
                  {dinero(p.monto)}
                  {Math.abs(p.abona - p.monto) > 0.004 && <span className="block text-xs text-[#8A8272]">cubre {dinero(p.abona)} BCV</span>}
                </span>
                {abierta && (
                  <button
                    type="button"
                    className="text-xs text-vino underline"
                    disabled={ocupado !== null}
                    onClick={() => ejecutar("quitar", () => eliminarPago(solicitud.id, p.id), () => "Pago eliminado.")}
                  >
                    Quitar
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {hayPagos && (
        <p className="mt-3 text-sm">
          Recibido <strong className="font-mono">{dinero(r.recibido)}</strong> ·{" "}
          {r.pagadoCompleto ? (
            <span className="text-esmeralda">pedido cubierto</span>
          ) : (
            <>
              falta <strong className="font-mono">{dinero(r.saldo)}</strong> en dólares BCV
              {hayDivisas && <> o <strong className="font-mono">{dinero(r.saldoDivisas)}</strong> en divisas</>}
            </>
          )}
        </p>
      )}

      {abierta && !r.pagadoCompleto && (
        <div className="mt-4 border-t border-piedra-oscura pt-4">
          <h3 className="mb-1 font-medium">{hayPagos ? "Registrar otro pago" : "Registrar pago o abono"}</h3>
          <p className="mb-3 text-xs text-[#8A8272]">
            Con el primer abono la mercancía queda reservada; el inventario se descuenta cuando el pedido esté cubierto. Puedes combinar métodos.
          </p>
          {bloqueo && <p className="mb-3 text-sm text-[#8A8272]">{bloqueo}</p>}
          <fieldset disabled={bloqueo !== null || ocupado !== null} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="metodo-pago" className="text-sm font-medium">Método</label>
              <select id="metodo-pago" value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoPago)} className="rounded-sm border border-piedra-oscura bg-white px-3 py-2.5 text-sm">
                {Object.entries(ETIQUETA_METODO).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <Input label="Monto recibido (USD)" name="monto-pago" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />
            {esBs && (
              <Input label="Tasa BCV (Bs/USD)" name="tasa-pago" inputMode="decimal" value={tasaTexto ?? (tasaVigente ? String(tasaVigente.valor) : "")} onChange={(e) => setTasaTexto(e.target.value)} />
            )}
            <Input label="Referencia (opcional)" name="ref-pago" value={referencia} maxLength={100} onChange={(e) => setReferencia(e.target.value)} />
          </fieldset>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#8A8272]">
            {abonaVista !== null && abonaVista > 0 && (
              <span>
                Cubre <strong className="font-mono">{dinero(abonaVista)}</strong> del pedido (a precio BCV)
                {esBs && tasaNum && montoNum ? ` · ${formatoBs(montoNum, tasaNum)}` : ""}
              </span>
            )}
            <button type="button" className="underline" onClick={() => { setMetodo("pago_movil"); setMonto(r.saldo.toFixed(2)); }}>
              Poner saldo en BCV ({dinero(r.saldo)})
            </button>
            {hayDivisas && (
              <button type="button" className="underline" onClick={() => { setMetodo("zelle"); setMonto(r.saldoDivisas.toFixed(2)); }}>
                Poner saldo en divisas ({dinero(r.saldoDivisas)})
              </button>
            )}
          </div>
          <div className="mt-3">
            <Button type="button" onClick={pagar} disabled={bloqueo !== null || ocupado !== null}>
              {ocupado === "pago" ? "Registrando…" : "Registrar pago"}
            </Button>
          </div>
        </div>
      )}

      {abierta && r.pagadoCompleto && (
        <div className="mt-4">
          <Button
            type="button"
            onClick={() => ejecutar("cerrar", () => cerrarVenta(solicitud.id), (s) => (s.estado === "cerrada" ? "Venta cerrada: se descontó el inventario." : "Sigue faltando mercancía."))}
            disabled={bloqueo !== null || ocupado !== null}
          >
            {ocupado === "cerrar" ? "Cerrando…" : solicitud.estado === "pendiente_stock" ? "Reintentar cierre" : "Cerrar venta"}
          </Button>
          {bloqueo && <p className="mt-2 text-sm text-[#8A8272]">{bloqueo}</p>}
        </div>
      )}

      {(solicitud.estado === "reservada" || (solicitud.estado === "pendiente_stock" && hayPagos)) && (
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-piedra-oscura pt-4">
          <div className="w-40">
            <Input label="Vence en (días)" name="dias-reserva" inputMode="numeric" value={dias} placeholder="7" onChange={(e) => setDias(e.target.value)} />
          </div>
          <Button
            type="button"
            variante="secundario"
            disabled={ocupado !== null || !Number.isInteger(Number(dias)) || Number(dias) < 1}
            onClick={() => ejecutar("prorroga", () => prorrogarReserva(solicitud.id, Number(dias)), () => "Vencimiento de la reserva actualizado.")}
          >
            Cambiar vencimiento
          </Button>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-vino">{error}</p>}
    </section>
  );
}
