"use client";

import { ETIQUETA_METODO, type MetodoPago } from "@/lib/panel/carrito";
import { useConfigDescuento } from "@/lib/tasas/tasas";

/** "X% de descuento pagando con …" — solo si hay un descuento activo y algún método elegido. */
export function AvisoDescuentoDivisas({ className }: { className?: string }) {
  const { descuentoDivisasPct: pct, descuentoMetodos } = useConfigDescuento();
  if (pct <= 0 || descuentoMetodos.length === 0) return null;
  const nombres = descuentoMetodos.map((m) => (ETIQUETA_METODO[m as MetodoPago] ?? m).toLowerCase());
  const lista = nombres.length > 1 ? `${nombres.slice(0, -1).join(", ")} o ${nombres[nombres.length - 1]}` : nombres[0];
  return (
    <p className={className ?? "border-l-2 border-esmeralda bg-white/60 px-3 py-2 text-sm text-[#4A4538]"}>
      <strong>{pct.toLocaleString("es-VE")}% de descuento</strong> pagando con {lista}.
    </p>
  );
}
