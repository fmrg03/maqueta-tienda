"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ETIQUETA_ROL, getUsuarioSesion, suscribirSesion } from "@/lib/auth/auth";
import { menuParaRol } from "@/lib/panel/menu";

export default function PanelInicio() {
  const usuario = useSyncExternalStore(suscribirSesion, getUsuarioSesion, () => null);
  if (!usuario) return null;

  const modulos = menuParaRol(usuario.rol).filter((i) => i.href !== "/panel");

  return (
    <div className="max-w-4xl">
      <h1 className="font-serif text-[26px] font-semibold">Resumen</h1>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <p className="mb-8 text-[#8A8272]">
        Estás ingresando como <strong>{ETIQUETA_ROL[usuario.rol]}</strong>. Estos son los módulos
        de tu rol.
      </p>

      <div className="grid gap-px bg-[#E3DCCC] sm:grid-cols-2">
        {modulos.map((m) =>
          m.disponible ? (
            <Link key={m.href} href={m.href} className="bg-white p-5 transition-colors hover:bg-[#FAF7F0]">
              <h2 className="font-semibold">{m.label}</h2>
              <p className="mt-1 text-sm text-[#8A8272]">{m.descripcion}</p>
            </Link>
          ) : (
            <div key={m.href} className="bg-white/60 p-5">
              <h2 className="font-semibold text-negro/60">{m.label}</h2>
              <p className="mt-1 text-sm text-[#8A8272]">{m.descripcion}</p>
              <p className="mt-2 font-mono text-[11px] text-[#8A8272]">Próximamente</p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
