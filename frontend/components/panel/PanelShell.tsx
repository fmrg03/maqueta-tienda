"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/Badge";
import {
  ETIQUETA_ROL,
  getUsuarioSesion,
  logout,
  suscribirSesion,
} from "@/lib/auth/auth";
import { itemDeRuta, menuParaRol } from "@/lib/panel/menu";

export function PanelShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const montado = useSyncExternalStore(() => () => {}, () => true, () => false);
  const usuario = useSyncExternalStore(suscribirSesion, getUsuarioSesion, () => null);

  const esPersonal = usuario !== null && usuario.rol !== "cliente";

  // Sin sesión -> login. Cliente (sin panel) -> inicio.
  useEffect(() => {
    if (!montado) return;
    if (!usuario) router.replace("/login");
    else if (usuario.rol === "cliente") router.replace("/");
  }, [montado, usuario, router]);

  if (!montado || !esPersonal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-negro text-texto-secundario">
        Cargando…
      </div>
    );
  }

  const menu = menuParaRol(usuario.rol);
  const actual = itemDeRuta(pathname);
  const permitido = !actual || actual.roles.includes(usuario.rol);

  async function salir() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-piedra text-negro md:flex-row">
      <aside className="bg-negro text-texto-claro md:w-64 md:shrink-0">
        <div className="border-b border-negro-suave px-5 py-5">
          <Link href="/" className="font-serif text-lg font-bold tracking-wide text-dorado-claro">
            Revestimiento Élite RY
          </Link>
          <p className="mt-1 text-xs text-texto-secundario">Panel de gestión</p>
        </div>

        <nav aria-label="Panel" className="flex gap-1 overflow-x-auto p-3 md:flex-col md:overflow-visible">
          {menu.map((item) => {
            const activo = pathname === item.href || (item.href !== "/panel" && pathname.startsWith(`${item.href}/`));
            if (!item.disponible) {
              return (
                <span
                  key={item.href}
                  title="Disponible próximamente"
                  className="flex shrink-0 items-center justify-between gap-2 rounded-sm px-3 py-2 text-sm text-texto-secundario/50"
                >
                  {item.label}
                  <span className="hidden font-mono text-[10px] md:inline">pronto</span>
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={clsx(
                  "shrink-0 rounded-sm px-3 py-2 text-sm transition-colors",
                  activo
                    ? "bg-negro-suave font-bold text-dorado-claro"
                    : "text-texto-secundario hover:bg-negro-suave hover:text-dorado-claro",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-piedra-oscura px-6 py-4">
          <p className="text-sm">
            Hola, <strong>{usuario.nombre}</strong>
          </p>
          <div className="flex items-center gap-4">
            <Badge tono="dorado">{ETIQUETA_ROL[usuario.rol]}</Badge>
            <Link href="/panel/cuenta" className="text-sm underline hover:text-dorado-oscuro">Mi cuenta</Link>
            <button type="button" onClick={salir} className="text-sm underline hover:text-dorado-oscuro">
              Salir
            </button>
          </div>
        </header>

        <main className="flex-1 px-6 py-8">
          {permitido ? (
            children
          ) : (
            <div role="alert" className="max-w-md">
              <h1 className="font-serif text-xl font-semibold">No tienes acceso a esta sección</h1>
              <p className="mt-2 text-[#4A4538]">Tu rol ({ETIQUETA_ROL[usuario.rol]}) no incluye este módulo.</p>
              <Link href="/panel" className="mt-4 inline-block underline">
                Volver al resumen
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
