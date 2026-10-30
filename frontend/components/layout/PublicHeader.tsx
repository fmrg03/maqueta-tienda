import Link from "next/link";
import { NavPublica } from "./NavPublica";
import { TasaHeader } from "./TasaHeader";

/** Encabezado del sitio público: siempre oscuro, fijo arriba al desplazarse. */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-linea bg-negro/90 backdrop-blur supports-[backdrop-filter]:bg-negro/75">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
        <Link href="/" className="font-serif text-lg font-semibold tracking-wide text-dorado-claro">
          Revestimiento Élite RY
        </Link>
        <TasaHeader />
        <NavPublica />
      </div>
    </header>
  );
}
