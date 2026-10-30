"use client";

import { useDescuentoDivisas } from "@/lib/tasas/tasas";

/** "X% de descuento pagando en divisas" — solo si el negocio tiene uno activo. */
export function AvisoDescuentoDivisas({ className }: { className?: string }) {
  const pct = useDescuentoDivisas();
  if (pct <= 0) return null;
  return (
    <p className={className ?? "border-l-2 border-esmeralda bg-white/60 px-3 py-2 text-sm text-[#4A4538]"}>
      <strong>{pct.toLocaleString("es-VE")}% de descuento</strong> pagando en divisas (efectivo o Zelle).
    </p>
  );
}
