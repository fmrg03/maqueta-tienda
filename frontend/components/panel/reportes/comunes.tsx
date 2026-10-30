"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";

/** Carga datos cuando cambia `clave`; descarta respuestas viejas. clave null = no cargar. */
export function useCarga<T>(clave: string | null, cargar: () => Promise<T>) {
  const [res, setRes] = useState<{ clave: string; valor: T } | "error" | null>(null);
  useEffect(() => {
    if (clave === null) return;
    let vigente = true;
    cargar()
      .then((valor) => vigente && setRes({ clave, valor }))
      .catch(() => vigente && setRes("error"));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  const datos = res && res !== "error" && res.clave === clave ? res.valor : null;
  return { datos, error: res === "error", cargando: clave !== null && !datos && res !== "error" };
}

export function Barra({ valor, max, clase, texto }: { valor: number; max: number; clase: string; texto: string }) {
  const pct = max > 0 ? Math.max((Math.abs(valor) / max) * 100, valor !== 0 ? 1.5 : 0) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-4 flex-1 bg-piedra"><div className={clsx("h-4", clase)} style={{ width: `${pct}%` }} /></div>
      <span className="w-24 text-right text-xs tabular-nums">{texto}</span>
    </div>
  );
}

export function Kpis({ items }: { items: Array<[string, string]> }) {
  return (
    <section aria-label="Resumen" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([t, v]) => (
        <div key={t} className="bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-[#8A8272]">{t}</p>
          <p className="mt-1 font-serif text-2xl font-semibold" data-testid={`kpi-${t}`}>{v}</p>
        </div>
      ))}
    </section>
  );
}

export function Estado({ cargando, error }: { cargando: boolean; error: boolean }) {
  if (error) return <p role="alert" className="text-vino">No pudimos cargar el reporte. Intenta de nuevo.</p>;
  if (cargando) return <p className="text-[#8A8272]">Cargando…</p>;
  return null;
}

export const Vacio = ({ children }: { children: React.ReactNode }) => <p className="bg-white p-6 text-[#8A8272]">{children}</p>;
