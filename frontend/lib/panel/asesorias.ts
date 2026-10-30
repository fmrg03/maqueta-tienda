import { apiFetch } from "../api/client";

export type EstadoAsesoria = "pendiente" | "llamada_realizada" | "visita_pactada" | "no_procede" | "cancelada";

export const ETIQUETA_ESTADO_ASESORIA: Record<EstadoAsesoria, string> = {
  pendiente: "Pendiente",
  llamada_realizada: "Llamada realizada",
  visita_pactada: "Visita pactada",
  no_procede: "No procede",
  cancelada: "Cancelada",
};

export const TONO_ESTADO_ASESORIA: Record<EstadoAsesoria, "neutro" | "exito" | "alerta" | "dorado"> = {
  pendiente: "dorado",
  llamada_realizada: "neutro",
  visita_pactada: "exito",
  no_procede: "neutro",
  cancelada: "neutro",
};

export const ESTADOS_ABIERTOS_ASESORIA: EstadoAsesoria[] = ["pendiente", "llamada_realizada"];

export interface SolicitudAsesoria {
  id: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail?: string | null;
  asesor?: { id: string; usuario?: { nombre?: string } } | null;
  fechaHoraLlamada: string;
  estado: EstadoAsesoria;
  notasLlamada?: string | null;
  createdAt: string;
}

const BASE = "/api/v1/asesorias/solicitudes";

export const listarAsesorias = () => apiFetch<SolicitudAsesoria[]>(BASE);
export const obtenerAsesoria = (id: string) => apiFetch<SolicitudAsesoria>(`${BASE}/${id}`);

export type AccionAsesoria = "registrar-llamada" | "marcar-visita-pactada" | "marcar-no-procede" | "cancelar";

export function ejecutarAccion(id: string, accion: AccionAsesoria, notasLlamada?: string): Promise<SolicitudAsesoria> {
  const body = accion === "cancelar" ? undefined : { notasLlamada: notasLlamada?.trim() || undefined };
  return apiFetch<SolicitudAsesoria>(`${BASE}/${id}/${accion}`, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
}

const zona = "America/Caracas";

export function fechaLlamada(iso: string): string {
  return new Intl.DateTimeFormat("es-VE", { timeZone: zona, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
}

const diaCaracas = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(d);

/** Cuándo es la llamada respecto a ahora, solo para solicitudes abiertas. */
export function cuandoEs(iso: string, ahora = new Date()): "atrasada" | "hoy" | "proxima" {
  const f = new Date(iso);
  if (diaCaracas(f) === diaCaracas(ahora)) return f.getTime() < ahora.getTime() ? "atrasada" : "hoy";
  return f.getTime() < ahora.getTime() ? "atrasada" : "proxima";
}

export interface RespuestaReagendar {
  solicitud: SolicitudAsesoria;
  /** Mensaje listo para enviarle al cliente por WhatsApp (wa.me). */
  texto: string;
  emailEnviado: boolean;
}

export function reagendarAsesoria(id: string, fechaHoraLlamada: string): Promise<RespuestaReagendar> {
  return apiFetch<RespuestaReagendar>(`${BASE}/${id}/reagendar`, { method: "PATCH", body: JSON.stringify({ fechaHoraLlamada }) });
}
