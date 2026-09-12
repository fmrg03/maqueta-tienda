import { clearTokens, getTokens, setTokens } from "../auth/token-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public detalle?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// El backend usa rotación de refresh tokens de UN SOLO USO (ver
// docs/ARCHITECTURE.md, sección "Rotación de refresh tokens"): si dos
// requests fallan por 401 al mismo tiempo y cada una intenta refrescar
// por separado, la SEGUNDA va a presentar un refresh token que la
// primera ya canjeó — el backend lo interpreta como reuso y revoca
// toda la sesión. Por eso el refresh se serializa acá: si ya hay uno
// en curso, todos los que lleguen mientras tanto esperan ese mismo
// resultado en vez de disparar uno propio.
let refreshEnCurso: Promise<boolean> | null = null;

async function refrescarSesion(): Promise<boolean> {
  if (refreshEnCurso) return refreshEnCurso;

  refreshEnCurso = (async () => {
    const tokens = getTokens();
    if (!tokens) return false;

    try {
      const respuesta = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (!respuesta.ok) {
        clearTokens();
        return false;
      }

      const nuevosTokens = await respuesta.json();
      setTokens(nuevosTokens);
      return true;
    } catch {
      clearTokens();
      return false;
    }
  })();

  try {
    return await refreshEnCurso;
  } finally {
    refreshEnCurso = null;
  }
}

interface ApiFetchOptions extends RequestInit {
  /** Si es false, no intenta adjuntar el access token (para endpoints públicos). */
  autenticado?: boolean;
}

/**
 * Wrapper de fetch: adjunta el access token, y si la respuesta es 401
 * intenta renovar la sesión UNA vez y reintenta el request original.
 * Si el refresh también falla, limpia la sesión y propaga el error —
 * quien llama decide qué hacer (típicamente redirigir a /login).
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { autenticado = true, headers, ...resto } = options;

  const construirHeaders = (): HeadersInit => {
    const base: Record<string, string> = {
      "Content-Type": "application/json",
      ...(headers as Record<string, string>),
    };
    if (autenticado) {
      const tokens = getTokens();
      if (tokens) base.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return base;
  };

  let respuesta = await fetch(`${API_URL}${path}`, {
    ...resto,
    headers: construirHeaders(),
    cache: "no-store", // datos siempre frescos — no usamos Cache Components de Next 16
  });

  if (respuesta.status === 401 && autenticado) {
    const renovado = await refrescarSesion();
    if (renovado) {
      respuesta = await fetch(`${API_URL}${path}`, {
        ...resto,
        headers: construirHeaders(),
        cache: "no-store",
      });
    }
  }

  if (!respuesta.ok) {
    let cuerpo: unknown;
    try {
      cuerpo = await respuesta.json();
    } catch {
      cuerpo = undefined;
    }
    const mensaje =
      (cuerpo as { message?: string | string[] })?.message ??
      "Ocurrió un error inesperado";
    throw new ApiError(
      respuesta.status,
      Array.isArray(mensaje) ? mensaje.join(", ") : mensaje,
      cuerpo,
    );
  }

  // 204/200 sin body (ej. logout) — evitar que .json() explote.
  const texto = await respuesta.text();
  return (texto ? JSON.parse(texto) : undefined) as T;
}
