"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api/client";
import {
  actualizarRol,
  crearRol,
  eliminarRol,
  listarRoles,
  type PermisoDef,
  type RolPanel,
} from "@/lib/panel/usuarios";

const msg = (e: unknown) => (e instanceof ApiError ? e.message : "No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.");

const aClave = (nombre: string) =>
  nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

export function PanelRoles() {
  const [datos, setDatos] = useState<{ roles: RolPanel[]; catalogo: PermisoDef[] } | null>(null);
  const [fallo, setFallo] = useState(false);
  const [seleccion, setSeleccion] = useState<string | "nuevo">("ventas");

  const cargar = useCallback(async () => {
    try {
      setDatos(await listarRoles());
      setFallo(false);
    } catch {
      setFallo(true);
    }
  }, []);
  useEffect(() => {
    let vigente = true;
    listarRoles()
      .then((d) => vigente && setDatos(d))
      .catch(() => vigente && setFallo(true));
    return () => {
      vigente = false;
    };
  }, []);

  if (fallo) return <p role="alert" className="text-vino">No pudimos cargar los roles. Recarga la página.</p>;
  if (!datos) return <p className="text-[#8A8272]">Cargando…</p>;

  const rol = datos.roles.find((r) => r.clave === seleccion);

  return (
    <div className="max-w-5xl">
      <h1 className="font-serif text-[26px] font-semibold">Roles y permisos</h1>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <p className="mb-6 max-w-2xl text-[#4A4538]">
        Define qué puede ver y hacer cada rol. Solo el administrador puede crear roles y cambiar sus permisos; los cambios aplican de inmediato.
      </p>

      <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
        <nav aria-label="Roles" className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
          {datos.roles.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={seleccion === r.clave}
              onClick={() => setSeleccion(r.clave)}
              className={clsx(
                "shrink-0 rounded-sm border px-3 py-2.5 text-left text-sm",
                seleccion === r.clave ? "border-negro bg-negro text-texto-claro" : "border-piedra-oscura bg-white hover:border-negro",
              )}
            >
              <span className="block font-semibold">{r.nombre}</span>
              <span className={clsx("block text-xs", seleccion === r.clave ? "text-texto-secundario" : "text-[#8A8272]")}>
                {r.usuarios} {r.usuarios === 1 ? "usuario" : "usuarios"}
              </span>
            </button>
          ))}
          <button
            type="button"
            aria-pressed={seleccion === "nuevo"}
            onClick={() => setSeleccion("nuevo")}
            className={clsx(
              "shrink-0 rounded-sm border border-dashed px-3 py-2.5 text-left text-sm font-medium",
              seleccion === "nuevo" ? "border-negro bg-white" : "border-piedra-oscura hover:border-negro",
            )}
          >
            + Nuevo rol
          </button>
        </nav>

        {seleccion === "nuevo" ? (
          <EditorRol
            key="nuevo"
            catalogo={datos.catalogo}
            onGuardado={async (clave) => {
              await cargar();
              setSeleccion(clave);
            }}
          />
        ) : rol ? (
          <EditorRol key={rol.id} rol={rol} catalogo={datos.catalogo} onGuardado={async () => cargar()} onEliminado={async () => { await cargar(); setSeleccion("ventas"); }} />
        ) : null}
      </div>
    </div>
  );
}

function EditorRol({
  rol,
  catalogo,
  onGuardado,
  onEliminado,
}: {
  rol?: RolPanel;
  catalogo: PermisoDef[];
  onGuardado: (clave: string) => Promise<void>;
  onEliminado?: () => Promise<void>;
}) {
  const esAdmin = rol?.clave === "admin";
  const [nombre, setNombre] = useState(rol?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(rol?.descripcion ?? "");
  const [permisos, setPermisos] = useState<Set<string>>(new Set(rol?.permisos ?? []));
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);

  const grupos = useMemo(() => {
    const m = new Map<string, PermisoDef[]>();
    for (const p of catalogo) m.set(p.grupo, [...(m.get(p.grupo) ?? []), p]);
    return [...m.entries()];
  }, [catalogo]);

  // `X.gestionar` incluye `X.ver`: se ve marcado y bloqueado.
  const incluido = (clave: string) => clave.endsWith(".ver") && permisos.has(clave.replace(".ver", ".gestionar"));

  function alternar(clave: string) {
    setOk(false);
    setPermisos((prev) => {
      const s = new Set(prev);
      if (s.has(clave)) s.delete(clave);
      else s.add(clave);
      return s;
    });
  }

  async function guardar() {
    setError(null);
    setOk(false);
    if (nombre.trim().length < 2) return setError("Escribe el nombre del rol.");
    setOcupado(true);
    try {
      const lista = [...permisos];
      if (rol) {
        await actualizarRol(rol.id, { nombre: nombre.trim(), descripcion: descripcion.trim(), permisos: lista });
        setOk(true);
        await onGuardado(rol.clave);
      } else {
        const clave = aClave(nombre);
        if (clave.length < 2) return setError("El nombre debe tener letras o números.");
        const creado = await crearRol({ clave, nombre: nombre.trim(), descripcion: descripcion.trim() || undefined, permisos: lista });
        await onGuardado(creado.clave);
      }
    } catch (e) {
      setError(msg(e));
    } finally {
      setOcupado(false);
    }
  }

  async function borrar() {
    if (!rol) return;
    setOcupado(true);
    setError(null);
    try {
      await eliminarRol(rol.id);
      await onEliminado?.();
    } catch (e) {
      setError(msg(e));
      setConfirmarBorrar(false);
    } finally {
      setOcupado(false);
    }
  }

  const solo = esAdmin;
  return (
    <section aria-label={rol ? `Rol ${rol.nombre}` : "Nuevo rol"} className="bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-serif text-xl font-semibold">{rol ? rol.nombre : "Nuevo rol"}</h2>
        {rol?.sistema && <Badge tono="dorado">{esAdmin ? "Acceso total" : "Rol base"}</Badge>}
      </div>

      {esAdmin && (
        <p className="mt-2 text-sm text-[#4A4538]">
          El administrador siempre tiene todos los permisos y es el único que gestiona usuarios, roles y permisos. No se puede modificar.
        </p>
      )}

      <div className="mt-4 grid max-w-xl gap-4">
        <Input label="Nombre" name="nombre-rol" value={nombre} maxLength={80} disabled={solo} onChange={(e) => { setNombre(e.target.value); setOk(false); }} />
        <Input label="Descripción (opcional)" name="descripcion-rol" value={descripcion} maxLength={255} disabled={solo} onChange={(e) => { setDescripcion(e.target.value); setOk(false); }} />
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {grupos.map(([grupo, lista]) => (
          <fieldset key={grupo} className="min-w-0">
            <legend className="mb-2 font-semibold">{grupo}</legend>
            <ul className="flex flex-col gap-2">
              {lista.map((p) => {
                const marcado = solo || permisos.has(p.clave) || incluido(p.clave);
                return (
                  <li key={p.clave}>
                    <label className={clsx("flex items-start gap-2 text-sm", (solo || incluido(p.clave)) && "opacity-60")}>
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#B8902F]"
                        checked={marcado}
                        disabled={solo || incluido(p.clave)}
                        onChange={() => alternar(p.clave)}
                      />
                      <span>{p.etiqueta}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-vino">{error}</p>}
      {ok && <p role="status" className="mt-4 text-sm text-[#3F6B3A]">Cambios guardados. Ya aplican para quienes tienen este rol.</p>}

      {!solo && (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-piedra-oscura pt-5">
          <Button type="button" onClick={guardar} disabled={ocupado}>
            {ocupado ? "Guardando…" : rol ? "Guardar cambios" : "Crear rol"}
          </Button>
          {rol && !rol.sistema && !confirmarBorrar && (
            <button type="button" disabled={ocupado} onClick={() => setConfirmarBorrar(true)} className="ml-auto text-sm text-vino underline">
              Eliminar rol
            </button>
          )}
          {rol && confirmarBorrar && (
            <span className="ml-auto flex items-center gap-3 text-sm">
              ¿Eliminar este rol?
              <Button type="button" onClick={borrar} disabled={ocupado}>Sí, eliminar</Button>
              <Button type="button" variante="secundario" onClick={() => setConfirmarBorrar(false)}>Cancelar</Button>
            </span>
          )}
        </div>
      )}
    </section>
  );
}
