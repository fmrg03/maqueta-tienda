import Link from "next/link";
import { clsx } from "clsx";
import { BotonWhatsAppFlotante } from "./BotonWhatsAppFlotante";
import { NavPublica } from "./NavPublica";
import { TasaHeader } from "./TasaHeader";

interface PublicHeaderProps {
  variante?: "oscuro" | "claro";
}

export function PublicHeader({ variante = "oscuro" }: PublicHeaderProps) {
  const esOscuro = variante === "oscuro";

  return (
    <header
      className={clsx(
        "flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b px-6 py-5",
        esOscuro
          ? "border-negro-suave/60 bg-negro text-texto-claro"
          : "border-piedra-oscura bg-piedra text-negro",
      )}
    >
      <Link
        href="/"
        className={clsx(
          "font-serif text-lg font-bold tracking-wide",
          esOscuro ? "text-dorado-claro" : "text-dorado-oscuro",
        )}
      >
        Revestimiento Élite RY
      </Link>
      <TasaHeader esOscuro={esOscuro} />
      <NavPublica esOscuro={esOscuro} />
      {/* position: fixed -> flota sobre toda la página pública */}
      <BotonWhatsAppFlotante />
    </header>
  );
}
