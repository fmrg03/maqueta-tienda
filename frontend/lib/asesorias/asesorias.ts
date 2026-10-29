import { apiFetch } from "../api/client";

export const ZONA_NEGOCIO = "America/Caracas";

export interface Asesor {
  id: string;
  nombre: string;
  especialidad: string | null;
}

export interface Franja {
  id: string;
  /** ISO 8601 en UTC (sufijo Z) — tal cual lo guarda y espera el backend. */
  fechaHora: string;
}

export interface DatosSolicitudAsesoria {
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail?: string;
  asesorId: string;
  fechaHoraLlamada: string;
}

export async function listarAsesores(): Promise<Asesor[]> {
  return apiFetch<Asesor[]>("/api/v1/asesores", { autenticado: false });
}

export async function listarFranjas(asesorId: string): Promise<Franja[]> {
  const franjas = await apiFetch<Franja[]>(
    `/api/v1/asesores/${encodeURIComponent(asesorId)}/disponibilidad`,
    { autenticado: false },
  );
  return franjas.map((f) => ({ id: f.id, fechaHora: f.fechaHora }));
}

export async function solicitarAsesoria(datos: DatosSolicitudAsesoria): Promise<void> {
  await apiFetch("/api/v1/asesorias/solicitud", {
    method: "POST",
    autenticado: false,
    body: JSON.stringify(datos),
  });
}

// --- Presentación: la conversión a hora de Venezuela ocurre SOLO acá ---

/** Clave de día en Caracas, "2026-10-30" (en-CA da formato ISO). */
export function diaCaracas(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_NEGOCIO }).format(new Date(iso));
}

export function etiquetaDia(iso: string): string {
  const s = new Intl.DateTimeFormat("es-VE", {
    timeZone: ZONA_NEGOCIO,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function etiquetaHora(iso: string): string {
  return new Intl.DateTimeFormat("es-VE", {
    timeZone: ZONA_NEGOCIO,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

/** Agrupa franjas (ya ordenadas) por día de Caracas. */
export function agruparPorDia(franjas: Franja[]): { dia: string; etiqueta: string; franjas: Franja[] }[] {
  const grupos = new Map<string, { dia: string; etiqueta: string; franjas: Franja[] }>();
  for (const f of franjas) {
    const dia = diaCaracas(f.fechaHora);
    if (!grupos.has(dia)) grupos.set(dia, { dia, etiqueta: etiquetaDia(f.fechaHora), franjas: [] });
    grupos.get(dia)!.franjas.push(f);
  }
  return [...grupos.values()];
}
