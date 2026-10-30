import { apiFetch } from "../api/client";

export type TipoMov = "entrada" | "salida";
export type OrigenMov = "venta" | "manual";

export interface Movimiento {
  id: string;
  tipo: TipoMov;
  cantidad: number;
  motivo?: string | null;
  solicitudId?: string | null;
  createdAt: string;
  variante?: {
    id: string;
    skuVariante: string;
    atributos: Record<string, string>;
    material?: { id: string; nombre: string; sku: string } | null;
  } | null;
  usuario?: { nombre?: string } | null;
}

export interface FiltrosMovimientos {
  tipo?: TipoMov;
  origen?: OrigenMov;
  desde?: string;
  hasta?: string;
  buscar?: string;
  limite: number;
}

export function listarMovimientos(f: FiltrosMovimientos): Promise<{ datos: Movimiento[]; total: number }> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== "") q.set(k, String(v));
  return apiFetch(`/api/v1/movimientos?${q.toString()}`);
}

export function fechaMovimiento(iso: string): string {
  return new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}
