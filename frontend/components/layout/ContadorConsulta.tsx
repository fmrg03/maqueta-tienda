"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { contarUnidades, suscribirCarrito } from "@/lib/carrito/carrito-store";

/** Enlace "Mi consulta" con la cantidad de unidades. Hereda el color del header. */
export function ContadorConsulta() {
  const unidades = useSyncExternalStore(suscribirCarrito, contarUnidades, () => 0);

  return (
    <Link href="/consulta" className="transition-colors hover:opacity-80">
      Mi consulta
      {unidades > 0 && (
        <span
          aria-label={`${unidades} ${unidades === 1 ? "unidad" : "unidades"} en tu consulta`}
          className="ml-1.5 inline-block rounded-sm bg-dorado-claro px-1.5 py-0.5 font-mono text-xs font-semibold text-negro"
        >
          {unidades}
        </span>
      )}
    </Link>
  );
}
