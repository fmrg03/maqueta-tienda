import { apiFetch } from "../api/client";
import { olvidarCachesTasas, type TasaBcv } from "../tasas/tasas";

export interface FilaTasa {
  id: string;
  fuente: "bcv" | "manual";
  valor: number;
  fechaFuente?: string | null;
  verificadaAt: string;
  createdAt: string;
}

const norm = (t: TasaBcv): TasaBcv => ({ ...t, valor: Number(t.valor) });

export async function tasaVigente(): Promise<TasaBcv | null> {
  try {
    return norm(await apiFetch<TasaBcv>("/api/v1/tasas/bcv", { autenticado: false }));
  } catch {
    return null;
  }
}

export async function historialTasas(): Promise<FilaTasa[]> {
  const f = await apiFetch<FilaTasa[]>("/api/v1/tasas/historial");
  return f.map((x) => ({ ...x, valor: Number(x.valor) }));
}

export async function actualizarTasa(): Promise<TasaBcv | null> {
  const t = await apiFetch<TasaBcv | null>("/api/v1/tasas/actualizar", { method: "POST" });
  olvidarCachesTasas();
  return t ? norm(t) : null;
}

export async function fijarTasaManual(valor: number): Promise<TasaBcv> {
  const t = await apiFetch<TasaBcv>("/api/v1/tasas/manual", { method: "POST", body: JSON.stringify({ valor }) });
  olvidarCachesTasas();
  return norm(t);
}

export async function descuentoDivisas(): Promise<number> {
  const c = await apiFetch<{ descuentoDivisasPct: number }>("/api/v1/configuracion/publica", { autenticado: false });
  return Number(c.descuentoDivisasPct);
}

export async function fijarDescuentoDivisas(porcentaje: number): Promise<number> {
  const c = await apiFetch<{ descuentoDivisasPct: number }>("/api/v1/configuracion/descuento-divisas", {
    method: "PUT",
    body: JSON.stringify({ porcentaje }),
  });
  olvidarCachesTasas();
  return Number(c.descuentoDivisasPct);
}
