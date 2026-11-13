"use client";

import { useEffect, useState } from "react";
import { listarRoles, type RolPanel } from "@/lib/panel/usuarios";

/** Roles configurables (solo el admin puede pedirlos). Devuelve [] mientras carga. */
export function useRoles(): { roles: RolPanel[]; nombre: (clave: string) => string } {
  const [roles, setRoles] = useState<RolPanel[]>([]);
  useEffect(() => {
    let vigente = true;
    listarRoles()
      .then((r) => vigente && setRoles(r.roles))
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, []);
  return { roles, nombre: (clave) => roles.find((r) => r.clave === clave)?.nombre ?? (clave === "cliente" ? "Cliente" : clave) };
}
