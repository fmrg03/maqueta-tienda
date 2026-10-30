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
  rol: "admin" | "ventas" | "asesor" | "cliente";
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

export async function registrar(
  nombre: string,
  email: string,
  password: string,
): Promise<Usuario> {
  const data = await apiFetch<RespuestaAuth>("/api/v1/auth/register", {
    method: "POST",
    autenticado: false,
    body: JSON.stringify({ nombre, email, password }),
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

export type RolUsuario = Usuario["rol"];

export const ETIQUETA_ROL: Record<RolUsuario, string> = {
  admin: "Administrador",
  ventas: "Ventas",
  asesor: "Asesor",
  cliente: "Cliente",
};

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
