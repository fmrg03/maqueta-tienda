import { BotonWhatsAppFlotante } from "./BotonWhatsAppFlotante";
import { PieDePagina } from "./PieDePagina";
import { PublicHeader } from "./PublicHeader";

/** Estructura común de todo el sitio público: encabezado, contenido y pie, siempre en oscuro. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-negro text-texto-claro">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PieDePagina />
      <BotonWhatsAppFlotante />
    </div>
  );
}

/** Título de página con la junta dorada debajo. */
export function TituloPagina({ children, descripcion }: { children: React.ReactNode; descripcion?: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">{children}</h1>
      <div className="junta-dorada my-4 h-0.5 w-14" />
      {descripcion && <p className="max-w-2xl text-texto-secundario">{descripcion}</p>}
    </div>
  );
}
