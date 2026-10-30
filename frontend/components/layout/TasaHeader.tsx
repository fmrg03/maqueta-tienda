"use client";

import { fechaTasa, useTasaBcv } from "@/lib/tasas/tasas";

const fmt = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Referencia del día: 1 USD = Bs. X. No se muestra si no hay ninguna tasa. */
export function TasaHeader() {
  const tasa = useTasaBcv();
  if (!tasa) return null;
  const etiqueta = tasa.fuente === "manual" ? "Tasa de referencia" : "Tasa BCV";
  return (
    <p
      className="hidden whitespace-nowrap rounded-sm border border-linea px-2.5 py-1 text-xs text-apagado lg:block"
      title={`${etiqueta} · actualizada ${fechaTasa(tasa.fecha)}${tasa.desactualizada ? " (puede estar desactualizada)" : ""}`}
    >
      {etiqueta}: <span className="font-mono font-semibold text-texto-claro">1 USD = Bs. {fmt.format(tasa.valor)}</span>
      {tasa.desactualizada && <span aria-label="desactualizada"> ⚠</span>}
    </p>
  );
}
