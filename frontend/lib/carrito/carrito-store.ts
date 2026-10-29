// Carrito de consulta (no es checkout): vive en localStorage del navegador.
// Todo acceso va envuelto en try/catch — localStorage puede no existir o fallar.

export interface ItemCarrito {
  varianteId: string;
  materialId: string;
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
    typeof i.varianteId === "string" &&
    typeof i.materialId === "string" &&
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
  const existente = items.find((i) => i.varianteId === nuevo.varianteId);
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
