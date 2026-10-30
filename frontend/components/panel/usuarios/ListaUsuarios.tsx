"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/Badge";
import { ETIQUETA_ROL, type RolUsuario } from "@/lib/auth/auth";
import { listarUsuarios, ROLES_PANEL, type EstadoUsuario, type UsuarioAdmin } from "@/lib/panel/usuarios";

const ESTADOS: Array<[EstadoUsuario, string]> = [["activos", "Activos"], ["inactivos", "Inactivos"], ["todos", "Todos"]];

export function ListaUsuarios() {
  const [estado, setEstado] = useState<EstadoUsuario>("activos");
  const [rol, setRol] = useState<RolUsuario | "">("");
  const [texto, setTexto] = useState("");
  const [buscar, setBuscar] = useState("");
  const [res, setRes] = useState<{ clave: string; datos: UsuarioAdmin[] | null } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setBuscar(texto.trim()), 300);
    return () => clearTimeout(t);
  }, [texto]);

  const clave = `${estado}|${rol}|${buscar}`;
  useEffect(() => {
    let vigente = true;
    listarUsuarios({ estado, rol: rol || undefined, buscar: buscar || undefined })
      .then((datos) => vigente && setRes({ clave, datos }))
      .catch(() => vigente && setRes({ clave, datos: null }));
    return () => {
      vigente = false;
    };
  }, [estado, rol, buscar, clave]);

  const cargando = res?.clave !== clave;
  const usuarios = res?.datos ?? null;
  const fallo = !cargando && res?.datos === null;

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-serif text-[26px] font-semibold">Usuarios</h1>
        <Link href="/panel/usuarios/nuevo" className="rounded-sm bg-gradient-to-br from-dorado-claro to-dorado-oscuro px-5 py-2.5 text-sm font-semibold text-negro hover:brightness-105">
          Nuevo usuario
        </Link>
      </div>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <p className="mb-6 text-[#8A8272]">Las personas que entran al panel y los clientes registrados. Aquí se crean cuentas, se cambian roles y se restablecen contraseñas.</p>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div role="group" aria-label="Estado" className="flex gap-2">
          {ESTADOS.map(([v, l]) => (
            <button key={v} type="button" aria-pressed={estado === v} onClick={() => setEstado(v)} className={clsx("rounded-sm border px-3 py-1.5 text-sm", estado === v ? "border-negro bg-negro text-texto-claro" : "border-piedra-oscura bg-white hover:border-negro")}>{l}</button>
          ))}
        </div>
        <label className="text-sm">Rol
          <select value={rol} onChange={(e) => setRol(e.target.value as RolUsuario | "")} className="mt-1 block rounded-sm border border-piedra-oscura bg-white px-2 py-1.5">
            <option value="">Todos</option>
            {ROLES_PANEL.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="text-sm">Buscar
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nombre o correo" className="mt-1 block rounded-sm border border-piedra-oscura bg-white px-2 py-1.5" />
        </label>
      </div>

      {fallo && <p role="alert" className="text-vino">No pudimos cargar los usuarios. Intenta de nuevo.</p>}
      {!usuarios && !fallo && <p className="text-[#8A8272]">Cargando…</p>}
      {usuarios && usuarios.length === 0 && <p className="bg-white p-6 text-[#8A8272]">No hay usuarios con esos filtros.</p>}

      {usuarios && usuarios.length > 0 && (
        <ul className={clsx("divide-y divide-piedra-oscura bg-white transition-opacity", cargando && "opacity-60")}>
          {usuarios.map((u) => (
            <li key={u.id}>
              <Link href={`/panel/usuarios/${u.id}`} className="grid items-center gap-x-4 gap-y-1 p-4 hover:bg-[#FAF7F0] sm:grid-cols-[1fr_auto_auto]">
                <div>
                  <p className="font-semibold">{u.nombre}</p>
                  <p className="text-xs text-[#8A8272]">{u.email}{u.telefono ? ` · ${u.telefono}` : ""}</p>
                </div>
                <p className="text-sm">{ETIQUETA_ROL[u.rol]}</p>
                <div className="flex flex-wrap gap-1 sm:justify-end">
                  {u.protegido && <Badge tono="dorado">cuenta protegida</Badge>}
                  {!u.activo && <Badge>inactivo</Badge>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
