import { apiFetch } from "../api/client";
import {
  clearTokens,
  getTokens,
  getUsuarioCrudo,
  setTokens,
  setUsuarioSesion,
  suscribirSesion,
  type Tokens,
} from "./token-store";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  /** Clave del rol (los roles se configuran en el panel). */
  rol: string;
  rolNombre?: string;
  permisos?: string[];
  telefono?: string;
  activo: boolean;
  protegido: boolean;
  createdAt: string;
}

type RespuestaAuth = { usuario: Usuario } & Tokens;

export async function login(email: string, password: string): Promise<Usuario> {
  const data = await apiFetch<RespuestaAuth>("/api/v1/auth/login", {
    method: "POST",
    autenticado: false,
    body: JSON.stringify({ email, password }),
  });
  setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  setUsuarioSesion(data.usuario);
  return data.usuario;
}

export async function logout(): Promise<void> {
  const tokens = getTokens();
  if (tokens) {
    try {
      await apiFetch("/api/v1/auth/logout", {
        method: "POST",
        autenticado: false,
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
    } catch {
      // Si el logout en el server falla (ej. red caída), igual limpiamos
      // localmente — el usuario espera salir de la sesión sí o sí.
    }
  }
  clearTokens();
}

// --- Lectura reactiva de la sesión (para componentes cliente) ---

export type RolUsuario = string;

/** Nombre legible del rol de un usuario (rolNombre viene del servidor). */
export function nombreRol(u: { rol: string; rolNombre?: string }): string {
  return u.rolNombre ?? (u.rol === "admin" ? "Administrador" : u.rol);
}

/** Admin siempre; el resto según los permisos de su rol (el servidor vuelve a validar). */
export function tienePermiso(u: Usuario | null | undefined, ...alguno: string[]): boolean {
  if (!u) return false;
  if (u.rol === "admin") return true;
  return alguno.some((p) => u.permisos?.includes(p));
}

/** Trae los permisos vigentes del servidor y actualiza la sesión si cambiaron. */
export async function refrescarPermisos(): Promise<void> {
  const actual = getUsuarioSesion();
  if (!actual) return;
  try {
    const r = await apiFetch<{ rol: string; rolNombre: string; permisos: string[] }>("/api/v1/auth/yo");
    if (r.rol !== actual.rol || r.rolNombre !== actual.rolNombre || r.permisos.join() !== (actual.permisos ?? []).join()) {
      setUsuarioSesion({ ...actual, rol: r.rol, rolNombre: r.rolNombre, permisos: r.permisos });
    }
  } catch {
    // sin conexión: se conserva lo guardado
  }
}

let cacheCrudo: string | null = null;
let cacheUsuario: Usuario | null = null;

/** Usuario de la sesión actual; misma referencia mientras el dato no cambie. */
export function getUsuarioSesion(): Usuario | null {
  const crudo = getUsuarioCrudo();
  if (crudo !== cacheCrudo) {
    cacheCrudo = crudo;
    try {
      cacheUsuario = crudo ? (JSON.parse(crudo) as Usuario) : null;
    } catch {
      cacheUsuario = null;
    }
  }
  return cacheUsuario;
}

export { suscribirSesion };
