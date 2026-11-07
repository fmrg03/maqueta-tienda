"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

export interface TasaBcv {
  valor: number;
  fuente: "bcv" | "manual";
  /** ISO: cuándo la fuente actualizó el valor (o cuándo se fijó a mano). */
  fecha: string;
  desactualizada: boolean;
}

// Una sola consulta compartida por todos los precios de la página; se vuelve a
// pedir cada 5 min. Si falla se devuelve null (la web simplemente no muestra Bs).
const VIGENCIA_MS = 5 * 60_000;
let cacheTasa: { en: number; promesa: Promise<TasaBcv | null> } | null = null;

export function obtenerTasaBcv(forzar = false): Promise<TasaBcv | null> {
  if (!forzar && cacheTasa && Date.now() - cacheTasa.en < VIGENCIA_MS) return cacheTasa.promesa;
  const promesa = apiFetch<TasaBcv>("/api/v1/tasas/bcv", { autenticado: false })
    .then((t) => ({ ...t, valor: Number(t.valor) }))
    .catch(() => null);
  cacheTasa = { en: Date.now(), promesa };
  return promesa;
}

/** Invalida los caches (tras editar la tasa desde el panel). */
export function olvidarCachesTasas(): void {
  cacheTasa = null;
}

export function useTasaBcv(): TasaBcv | null {
  const [tasa, setTasa] = useState<TasaBcv | null>(null);
  useEffect(() => {
    let vigente = true;
    obtenerTasaBcv().then((t) => vigente && setTasa(t));
    return () => {
      vigente = false;
    };
  }, []);
  return tasa;
}

const fmtBs = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "Bs. 12.345,67" */
export function formatoBs(usd: number, tasa: number): string {
  return `Bs. ${fmtBs.format(usd * tasa)}`;
}

export function fechaTasa(iso: string): string {
  return new Intl.DateTimeFormat("es-VE", { timeZone: "America/Caracas", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
}
