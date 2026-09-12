import { apiFetch } from "../api/client";
import { clearTokens, getTokens, setTokens, type Tokens } from "./token-store";

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
