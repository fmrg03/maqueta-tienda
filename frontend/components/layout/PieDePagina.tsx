import Link from "next/link";
import { HAY_WHATSAPP, enlaceChat } from "@/lib/whatsapp";

const ENLACES = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/combos", label: "Combos" },
  { href: "/agendar-asesoria", label: "Agendar asesoría" },
  { href: "/consulta", label: "Mi consulta" },
];

export function PieDePagina() {
  const chat = HAY_WHATSAPP ? enlaceChat("Hola, tengo una consulta sobre sus productos.") : null;
  return (
    <footer className="mt-24 border-t border-linea bg-carbon">
      <div className="junta-dorada h-px" />
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-serif text-xl font-semibold text-dorado-claro">Revestimiento Élite RY</p>
          <p className="mt-3 max-w-xs text-sm text-texto-secundario">
            Porcelanato, cerámica, grifería y materiales de construcción. Barquisimeto, Venezuela.
          </p>
        </div>
        <nav aria-label="Pie de página">
          <p className="mb-3 text-sm font-medium text-texto-claro">Explorar</p>
          <ul className="space-y-2 text-sm">
            {ENLACES.map((e) => (
              <li key={e.href}>
                <Link href={e.href} className="text-texto-secundario transition-colors hover:text-dorado-claro">{e.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="mb-3 text-sm font-medium text-texto-claro">Escríbenos</p>
          {chat ? (
            <a href={chat} target="_blank" rel="noopener noreferrer" className="text-sm text-texto-secundario transition-colors hover:text-dorado-claro">
              WhatsApp con un asesor
            </a>
          ) : (
            <Link href="/agendar-asesoria" className="text-sm text-texto-secundario transition-colors hover:text-dorado-claro">
              Agenda una llamada con un asesor
            </Link>
          )}
          <p className="mt-3 text-xs text-apagado">Los precios están en USD, con referencia en bolívares a la tasa BCV del día.</p>
        </div>
      </div>
    </footer>
  );
}
