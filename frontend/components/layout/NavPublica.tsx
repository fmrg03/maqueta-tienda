"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { clsx } from "clsx";
import { getUsuarioSesion, suscribirSesion } from "@/lib/auth/auth";
import { ContadorConsulta } from "./ContadorConsulta";

const LINKS = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/combos", label: "Combos" },
  { href: "/agendar-asesoria", label: "Agendar asesoría" },
];

/** Una ruta está activa si es la misma o una hija (/catalogo/123 activa "Catálogo"). */
function estaActiva(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavPublica({ esOscuro }: { esOscuro: boolean }) {
  const pathname = usePathname();
  const usuario = useSyncExternalStore(suscribirSesion, getUsuarioSesion, () => null);
  // No se muestra "Ingresar" al público: el personal entra yendo directo a /login.
  // Con sesión de personal activa sí aparece el acceso directo al panel.
  const acceso = usuario && usuario.rol !== "cliente" ? { href: "/panel", label: "Mi panel" } : null;

  const clase = (activo: boolean) =>
    clsx(
      "transition-colors",
      activo
        ? clsx("font-bold", esOscuro ? "text-dorado-claro" : "text-negro")
        : esOscuro
          ? "text-texto-secundario hover:text-dorado-claro"
          : "text-negro/70 hover:text-dorado-oscuro",
    );

  return (
    <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm sm:gap-x-7">
      {(acceso ? [...LINKS, acceso] : LINKS).map((link) => {
        const activo = estaActiva(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={activo ? "page" : undefined}
            className={clase(activo)}
          >
            {link.label}
          </Link>
        );
      })}
      <ContadorConsulta className={clase(estaActiva(pathname, "/consulta"))} activo={estaActiva(pathname, "/consulta")} />
    </nav>
  );
}
