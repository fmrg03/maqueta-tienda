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

export interface ConfigPublica {
  descuentoDivisasPct: number;
  /** Métodos de pago a los que aplica el descuento (ej. "zelle", "binance"). */
  descuentoMetodos: string[];
}

// Una sola consulta compartida por todos los precios de la página; se vuelve a
// pedir cada 5 min. Si falla se devuelve null (la web simplemente no muestra Bs).
const VIGENCIA_MS = 5 * 60_000;
let cacheTasa: { en: number; promesa: Promise<TasaBcv | null> } | null = null;
let cacheConfig: { en: number; promesa: Promise<ConfigPublica | null> } | null = null;

export function obtenerTasaBcv(forzar = false): Promise<TasaBcv | null> {
  if (!forzar && cacheTasa && Date.now() - cacheTasa.en < VIGENCIA_MS) return cacheTasa.promesa;
  const promesa = apiFetch<TasaBcv>("/api/v1/tasas/bcv", { autenticado: false })
    .then((t) => ({ ...t, valor: Number(t.valor) }))
    .catch(() => null);
  cacheTasa = { en: Date.now(), promesa };
  return promesa;
}

export function obtenerConfigPublica(forzar = false): Promise<ConfigPublica | null> {
  if (!forzar && cacheConfig && Date.now() - cacheConfig.en < VIGENCIA_MS) return cacheConfig.promesa;
  const promesa = apiFetch<ConfigPublica>("/api/v1/configuracion/publica", { autenticado: false })
    .then((c) => ({ descuentoDivisasPct: Number(c.descuentoDivisasPct), descuentoMetodos: c.descuentoMetodos ?? [] }))
    .catch(() => null);
  cacheConfig = { en: Date.now(), promesa };
  return promesa;
}

/** Invalida los caches (tras editar la tasa o el descuento desde el panel). */
export function olvidarCachesTasas(): void {
  cacheTasa = null;
  cacheConfig = null;
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

export function useConfigDescuento(): ConfigPublica {
  const [config, setConfig] = useState<ConfigPublica>({ descuentoDivisasPct: 0, descuentoMetodos: [] });
  useEffect(() => {
    let vigente = true;
    obtenerConfigPublica().then((c) => vigente && c && setConfig(c));
    return () => {
      vigente = false;
    };
  }, []);
  return config;
}

const fmtBs = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "Bs. 12.345,67" */
export function formatoBs(usd: number, tasa: number): string {
  return `Bs. ${fmtBs.format(usd * tasa)}`;
}

export function fechaTasa(iso: string): string {
  return new Intl.DateTimeFormat("es-VE", { timeZone: "America/Caracas", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
}
