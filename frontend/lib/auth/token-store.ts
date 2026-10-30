export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

const CLAVE_STORAGE = "maqueta-tienda:tokens";

/**
 * Guardamos los tokens en una variable en memoria (rápido, no requiere
 * parsear JSON en cada request) con sessionStorage como respaldo para
 * sobrevivir un F5 sin perder la sesión — se pierde al cerrar la
 * pestaña, a diferencia de localStorage, que quedaría indefinidamente.
 *
 * Nota de seguridad honesta: esto sigue siendo legible por JavaScript,
 * así que un XSS podría robarlos — React escapa por defecto y no
 * usamos dangerouslySetInnerHTML en ningún lado, lo cual reduce mucho
 * el riesgo real, pero no es lo mismo que una cookie httpOnly (que
 * necesitaría cambios en el backend para emitirlas). Documentado como
 * decisión consciente, no como descuido — revisar si el negocio maneja
 * datos más sensibles en el futuro.
 */
let tokensEnMemoria: Tokens | null = null;

export function getTokens(): Tokens | null {
  if (tokensEnMemoria) return tokensEnMemoria;
  if (typeof window === "undefined") return null;

  const guardado = window.sessionStorage.getItem(CLAVE_STORAGE);
  if (!guardado) return null;

  try {
    tokensEnMemoria = JSON.parse(guardado) as Tokens;
    return tokensEnMemoria;
  } catch {
    return null;
  }
}

export function setTokens(tokens: Tokens): void {
  tokensEnMemoria = tokens;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(CLAVE_STORAGE, JSON.stringify(tokens));
  }
}

export function clearTokens(): void {
  tokensEnMemoria = null;
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(CLAVE_STORAGE);
    window.sessionStorage.removeItem(CLAVE_USUARIO);
    window.dispatchEvent(new Event(EVENTO_SESION));
  }
}

// --- Usuario de la sesión (nombre y rol, para armar el panel) ---
// Solo sirve para MOSTRAR y para decidir qué menú ver: la autorización real
// la hace el backend en cada request (JWT + roles + RLS). Manipular esto en
// el navegador no da acceso a nada.
const CLAVE_USUARIO = "maqueta-tienda:usuario";
const EVENTO_SESION = "maqueta-tienda:sesion-cambio";

export function setUsuarioSesion(usuario: unknown): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
  window.dispatchEvent(new Event(EVENTO_SESION));
}

/** Texto crudo del usuario guardado (primitivo estable, apto como snapshot). */
export function getUsuarioCrudo(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(CLAVE_USUARIO);
  } catch {
    return null;
  }
}

export function suscribirSesion(callback: () => void): () => void {
  window.addEventListener(EVENTO_SESION, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENTO_SESION, callback);
    window.removeEventListener("storage", callback);
  };
}
