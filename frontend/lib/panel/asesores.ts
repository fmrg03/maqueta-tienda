import { apiFetch } from "../api/client";

export interface AsesorAdmin {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  especialidad: string | null;
  activo: boolean;
  franjasLibres: number;
  asesoriasPendientes: number;
}

export interface FranjaAgenda {
  id: string;
  fechaHora: string;
  disponible: boolean;
  solicitudId: string | null;
  clienteNombre: string | null;
}

export type FiltroEstadoAsesor = "activos" | "inactivos" | "todos";

export const listarAsesoresAdmin = (estado: FiltroEstadoAsesor) =>
  apiFetch<AsesorAdmin[]>(`/api/v1/asesores/admin?estado=${estado}`);

export async function obtenerAsesorAdmin(id: string): Promise<AsesorAdmin | null> {
  return (await listarAsesoresAdmin("todos")).find((a) => a.id === id) ?? null;
}

export interface DatosNuevoAsesor {
  nombre: string;
  email: string;
  password: string;
  telefono?: string;
  especialidad?: string;
}

export const crearAsesor = (d: DatosNuevoAsesor) =>
  apiFetch<{ id: string }>("/api/v1/asesores", { method: "POST", body: JSON.stringify(d) });

export const actualizarAsesor = (id: string, d: { especialidad?: string; activo?: boolean }) =>
  apiFetch(`/api/v1/asesores/${id}`, { method: "PATCH", body: JSON.stringify(d) });

export const agendaAsesor = (id: string) => apiFetch<FranjaAgenda[]>(`/api/v1/asesores/${id}/agenda`);

export const agregarHorarios = (id: string, fechasHora: string[]) =>
  apiFetch<{ creadas: number; omitidas: number }>(`/api/v1/asesores/${id}/disponibilidad/lote`, {
    method: "POST",
    body: JSON.stringify({ fechasHora }),
  });

export const eliminarHorario = (franjaId: string) =>
  apiFetch(`/api/v1/asesores/disponibilidad/${franjaId}`, { method: "DELETE" });

// --- Generador de horarios (hora de Venezuela, UTC-4 todo el año, sin horario de verano) ---

export const DIAS_SEMANA = [
  { n: 1, corto: "Lun" },
  { n: 2, corto: "Mar" },
  { n: 3, corto: "Mié" },
  { n: 4, corto: "Jue" },
  { n: 5, corto: "Vie" },
  { n: 6, corto: "Sáb" },
  { n: 0, corto: "Dom" },
];

export const MAX_LOTE = 300;

export interface PlanHorarios {
  desde: string; // AAAA-MM-DD
  hasta: string;
  dias: number[]; // 0 = domingo
  horaInicio: string; // HH:MM
  horaFin: string; // HH:MM (la última llamada empieza antes de esta hora)
  cadaMin: number;
}

const aMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const pad = (n: number) => String(n).padStart(2, "0");

/** Instantes ISO (UTC) de todas las llamadas que genera el plan, solo futuras. */
export function generarFechasHora(p: PlanHorarios, ahora = Date.now()): string[] {
  if (!p.desde || !p.hasta || !p.horaInicio || !p.horaFin || p.cadaMin < 5) return [];
  const ini = aMin(p.horaInicio);
  const fin = aMin(p.horaFin);
  const resultado: string[] = [];
  const [y, mo, d] = p.desde.split("-").map(Number);
  const [y2, mo2, d2] = p.hasta.split("-").map(Number);
  const ultimo = Date.UTC(y2, mo2 - 1, d2);
  for (let t = Date.UTC(y, mo - 1, d); t <= ultimo; t += 86_400_000) {
    const dia = new Date(t);
    if (!p.dias.includes(dia.getUTCDay())) continue;
    const fecha = `${dia.getUTCFullYear()}-${pad(dia.getUTCMonth() + 1)}-${pad(dia.getUTCDate())}`;
    for (let m = ini; m < fin; m += p.cadaMin) {
      const iso = new Date(`${fecha}T${pad(Math.floor(m / 60))}:${pad(m % 60)}:00-04:00`);
      if (iso.getTime() > ahora) resultado.push(iso.toISOString());
    }
  }
  return resultado;
}
