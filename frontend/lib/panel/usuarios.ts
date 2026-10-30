import { apiFetch } from "../api/client";
import type { RolUsuario } from "../auth/auth";

export interface UsuarioAdmin {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  telefono?: string | null;
  activo: boolean;
  protegido: boolean;
  createdAt: string;
}

export type EstadoUsuario = "activos" | "inactivos" | "todos";

export const listarUsuarios = (f: { rol?: RolUsuario; estado: EstadoUsuario; buscar?: string }) => {
  const q = new URLSearchParams({ estado: f.estado });
  if (f.rol) q.set("rol", f.rol);
  if (f.buscar) q.set("buscar", f.buscar);
  return apiFetch<UsuarioAdmin[]>(`/api/v1/usuarios?${q}`);
};

export const obtenerUsuario = (id: string) => apiFetch<UsuarioAdmin>(`/api/v1/usuarios/${id}`);

export interface DatosUsuario { nombre: string; email: string; rol: RolUsuario; telefono?: string }

export const crearUsuario = (d: DatosUsuario & { password: string }) =>
  apiFetch<UsuarioAdmin>("/api/v1/usuarios", { method: "POST", body: JSON.stringify(d) });

export const actualizarUsuario = (id: string, d: Partial<DatosUsuario> & { activo?: boolean }) =>
  apiFetch<UsuarioAdmin>(`/api/v1/usuarios/${id}`, { method: "PATCH", body: JSON.stringify(d) });

export const restablecerPassword = (id: string, password?: string) =>
  apiFetch<{ passwordTemporal?: string }>(`/api/v1/usuarios/${id}/restablecer-password`, {
    method: "POST",
    body: JSON.stringify(password ? { password } : {}),
  });

export const ROLES_PANEL: Array<[RolUsuario, string]> = [["admin", "Administrador"], ["ventas", "Ventas"], ["asesor", "Asesor"], ["cliente", "Cliente"]];
