import type { ItemCarrito } from "./carrito/carrito-store";

const NUMERO = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

/** ¿Está configurado el número de ventas? (si no, no se ofrece WhatsApp). */
export const HAY_WHATSAPP = NUMERO !== "";

/** Enlace wa.me con la consulta ya redactada; null si no hay número configurado. */
export function enlaceWhatsApp(nombre: string, items: ItemCarrito[]): string | null {
  if (!NUMERO) return null;
  const lineas = items.map(
    (i) =>
      `• ${i.cantidad} × ${i.nombre}${i.tipo === "variante" ? ` (${i.presentacion})` : " (combo)"}` +
      ` — $${i.precioVenta.toFixed(2)} c/u = $${(i.precioVenta * i.cantidad).toFixed(2)}`,
  );
  const total = items.reduce((s, i) => s + i.precioVenta * i.cantidad, 0);
  const texto = [
    `Hola, soy ${nombre}. Acabo de enviar una consulta desde la web:`,
    ...lineas,
    `Total de referencia: $${total.toFixed(2)}`,
    "¿Me pueden confirmar disponibilidad y precio?",
  ].join("\n");
  return `https://wa.me/${NUMERO}?text=${encodeURIComponent(texto)}`;
}
