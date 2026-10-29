// Carrito de consulta (no es checkout): vive en localStorage del navegador.
// Todo acceso va envuelto en try/catch — localStorage puede no existir o fallar.

export interface ItemCarrito {
  /** Una presentación (variante) o un combo completo. */
  tipo: "variante" | "combo";
  /** id de la variante o del combo, según `tipo`. */
  refId: string;
  nombre: string;
  presentacion: string;
  precioVenta: number;
  cantidad: number;
}

const CLAVE = "maqueta-tienda:carrito";

function esItemValido(x: unknown): x is ItemCarrito {
  if (typeof x !== "object" || x === null) return false;
  const i = x as Record<string, unknown>;
  return (
    (i.tipo === "variante" || i.tipo === "combo") &&
    typeof i.refId === "string" &&
    typeof i.nombre === "string" &&
    typeof i.presentacion === "string" &&
    typeof i.precioVenta === "number" &&
    typeof i.cantidad === "number" &&
    Number.isInteger(i.cantidad) &&
    i.cantidad > 0
  );
}

export function getCarrito(): ItemCarrito[] {
  try {
    const raw = window.localStorage.getItem(CLAVE);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(esItemValido) : [];
  } catch {
    return [];
  }
}

function guardar(items: ItemCarrito[]): void {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(items));
  } catch {
    /* sin storage: el carrito simplemente no persiste */
  }
}

export function agregarItem(nuevo: ItemCarrito): ItemCarrito[] {
  const items = getCarrito();
  const existente = items.find((i) => i.tipo === nuevo.tipo && i.refId === nuevo.refId);
  if (existente) existente.cantidad += nuevo.cantidad;
  else items.push(nuevo);
  guardar(items);
  return items;
}

export function vaciarCarrito(): void {
  try {
    window.localStorage.removeItem(CLAVE);
  } catch {
    /* noop */
  }
}

export function quitarItem(tipo: ItemCarrito["tipo"], refId: string): ItemCarrito[] {
  const items = getCarrito().filter((i) => !(i.tipo === tipo && i.refId === refId));
  guardar(items);
  return items;
}

export function cambiarCantidadItem(
  tipo: ItemCarrito["tipo"],
  refId: string,
  cantidad: number,
): ItemCarrito[] {
  const items = getCarrito();
  const item = items.find((i) => i.tipo === tipo && i.refId === refId);
  if (item && Number.isInteger(cantidad) && cantidad > 0) item.cantidad = cantidad;
  guardar(items);
  return items;
}
