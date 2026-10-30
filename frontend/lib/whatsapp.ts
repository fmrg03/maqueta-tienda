import type { ItemCarrito } from "./carrito/carrito-store";

const NUMERO = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

/** ¿Está configurado el número de ventas? (si no, no se ofrece WhatsApp). */
export const HAY_WHATSAPP = NUMERO !== "";

/** Enlace wa.me con la consulta ya redactada; null si no hay número configurado. */
export function enlaceWhatsApp(nombre: string, items: ItemCarrito[]): string | null {
  if (!NUMERO) return null;
  const lineas = items.map(
    (i) =>
      `• ${i.cantidad} × ${i.nombre}${i.tipo === "variante" ? ` (${i.presentacion})` : " (combo)"}`,
  );
  const texto = [
    `Hola, soy ${nombre}. Acabo de enviar una consulta desde la web:`,
    ...lineas,
    "¿Me pueden confirmar disponibilidad y precio?",
  ].join("\n");
  return `https://wa.me/${NUMERO}?text=${encodeURIComponent(texto)}`;
}
