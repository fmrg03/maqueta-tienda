"use client";

import { formatoBs, useTasaBcv } from "@/lib/tasas/tasas";

/**
 * "≈ Bs. 1.234,56" para un monto en USD, con la tasa BCV vigente.
 * No renderiza nada mientras carga o si no hay tasa (la web sigue en USD).
 */
export function PrecioBs({ usd, className }: { usd: number; className?: string }) {
  const tasa = useTasaBcv();
  if (!tasa) return null;
  return (
    <span className={className} title={`Tasa BCV ${tasa.valor.toFixed(2)} Bs/USD${tasa.desactualizada ? " (sin confirmar hace más de 24 h)" : ""}`}>
      ≈ {formatoBs(usd, tasa.valor)}
    </span>
  );
}
