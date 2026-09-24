import Link from "next/link";
import { clsx } from "clsx";

interface PublicHeaderProps {
  variante?: "oscuro" | "claro";
}

const LINKS = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/combos", label: "Combos" },
  { href: "/agendar-asesoria", label: "Agendar asesoría" },
  { href: "/login", label: "Ingresar" },
];

export function PublicHeader({ variante = "oscuro" }: PublicHeaderProps) {
  const esOscuro = variante === "oscuro";

  return (
    <header
      className={clsx(
        "flex items-center justify-between border-b px-6 py-5",
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
      <nav className="flex gap-7 text-sm">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "transition-colors",
              esOscuro
                ? "text-texto-secundario hover:text-dorado-claro"
                : "text-negro/70 hover:text-dorado-oscuro",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
