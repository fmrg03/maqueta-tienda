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
  }
}
