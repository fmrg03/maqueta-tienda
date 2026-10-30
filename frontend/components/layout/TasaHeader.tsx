"use client";

import { clsx } from "clsx";
import { fechaTasa, useTasaBcv } from "@/lib/tasas/tasas";

const fmt = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Referencia del día: 1 USD = Bs. X. No se muestra si no hay ninguna tasa. */
export function TasaHeader({ esOscuro }: { esOscuro: boolean }) {
  const tasa = useTasaBcv();
  if (!tasa) return null;
  const etiqueta = tasa.fuente === "manual" ? "Tasa de referencia" : "Tasa BCV";
  return (
    <p
      className={clsx(
        "hidden whitespace-nowrap rounded-sm border px-2.5 py-1 text-xs lg:block",
        esOscuro ? "border-texto-secundario/40 text-texto-secundario" : "border-negro/20 text-negro/70",
      )}
      title={`${etiqueta} · actualizada ${fechaTasa(tasa.fecha)}${tasa.desactualizada ? " (puede estar desactualizada)" : ""}`}
    >
      {etiqueta}: <span className="font-mono font-semibold">1 USD = Bs. {fmt.format(tasa.valor)}</span>
      {tasa.desactualizada && <span aria-label="desactualizada"> ⚠</span>}
    </p>
  );
}
