"use client";

import { HAY_WHATSAPP, enlaceChat } from "@/lib/whatsapp";

/**
 * Botón flotante (esquina inferior derecha) para escribirle a un asesor por
 * WhatsApp ante cualquier otra consulta. Sin número configurado no se muestra.
 * El mensaje incluye la página que la persona estaba viendo.
 */
export function BotonWhatsAppFlotante() {
  if (!HAY_WHATSAPP) return null;

  const base = enlaceChat("Hola, tengo una consulta sobre sus productos.")!;

  function abrir(e: React.MouseEvent<HTMLAnchorElement>) {
    // El enlace funciona sin JavaScript; con él, se agrega la página actual.
    const url = enlaceChat(
      `Hola, tengo una consulta sobre sus productos. Estoy viendo: ${window.location.href}`,
    );
    if (url) {
      e.preventDefault();
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <a
      href={base}
      target="_blank"
      rel="noopener noreferrer"
      onClick={abrir}
      aria-label="Escribir a un asesor por WhatsApp"
      title="¿Dudas? Escríbele a un asesor"
      className="fixed bottom-4 right-4 z-50 flex h-12 w-12 md:bottom-6 md:right-6 md:h-14 md:w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado"
    >
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" fill="currentColor">
        <path d="M16.02 3C8.84 3 3 8.83 3 16c0 2.29.6 4.52 1.74 6.49L3 29l6.7-1.71A12.97 12.97 0 0 0 16.02 29C23.2 29 29 23.17 29 16S23.2 3 16.02 3Zm0 23.8c-2 0-3.95-.54-5.66-1.56l-.4-.24-3.98 1.02 1.06-3.88-.26-.4A10.74 10.74 0 0 1 5.2 16c0-5.96 4.86-10.8 10.82-10.8 5.97 0 10.78 4.84 10.78 10.8s-4.81 10.8-10.78 10.8Zm5.93-8.08c-.32-.16-1.92-.95-2.22-1.06-.3-.1-.52-.16-.74.16-.22.32-.85 1.06-1.04 1.28-.19.22-.38.24-.7.08-.32-.16-1.37-.5-2.6-1.6-.96-.86-1.6-1.9-1.8-2.22-.18-.32-.02-.5.14-.66.15-.14.32-.38.48-.57.16-.19.22-.32.32-.54.1-.22.05-.4-.03-.57-.08-.16-.74-1.78-1.01-2.44-.26-.64-.54-.55-.74-.56h-.63c-.22 0-.57.08-.87.4-.3.32-1.14 1.12-1.14 2.72s1.17 3.15 1.33 3.37c.16.22 2.3 3.5 5.57 4.92.78.34 1.38.54 1.86.7.78.25 1.5.21 2.06.13.63-.1 1.92-.78 2.19-1.54.27-.76.27-1.4.19-1.54-.08-.14-.3-.22-.62-.38Z" />
      </svg>
    </a>
  );
}
