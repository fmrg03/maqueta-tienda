import { apiFetch } from "../api/client";
import type { ItemCarrito } from "./carrito-store";

export interface DatosContacto {
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail?: string;
}

/**
 * Teléfono venezolano -> formato que valida el backend (IsPhoneNumber('VE')).
 * Acepta "0414-1234567", "0414 123 4567", "+58 414 1234567", "4141234567".
 * Devuelve null si no parece un número válido.
 */
export function normalizarTelefonoVE(entrada: string): string | null {
  let d = entrada.replace(/[^\d+]/g, "");
  if (d.startsWith("+58")) d = d.slice(3);
  else if (d.startsWith("58") && d.length === 12) d = d.slice(2);
  else if (d.startsWith("0")) d = d.slice(1);
  return /^\d{10}$/.test(d) ? `+58${d}` : null;
}

export async function enviarSolicitud(
  contacto: DatosContacto,
  items: ItemCarrito[],
): Promise<void> {
  await apiFetch("/api/v1/carrito/solicitud", {
    method: "POST",
    autenticado: false,
    body: JSON.stringify({
      ...contacto,
      canalEnvio: "formulario",
      items: items.map((i) => ({
        // El backend exige EXACTAMENTE uno de materialId/varianteId/comboId.
        varianteId: i.varianteId,
        cantidad: i.cantidad,
      })),
    }),
  });
}
