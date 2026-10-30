"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/Badge";
import { ApiError } from "@/lib/api/client";
import { crearAsesor, listarAsesoresAdmin } from "@/lib/panel/asesores";
import { getUsuarioSesion, suscribirSesion } from "@/lib/auth/auth";
import { actualizarUsuario, obtenerUsuario, restablecerPassword, type UsuarioAdmin } from "@/lib/panel/usuarios";
import { Modal } from "../carrito/Dialogos";
import { FormularioUsuario } from "./FormularioUsuario";

export function DetalleUsuario({ id, recienCreado }: { id: string; recienCreado: boolean }) {
  const yo = useSyncExternalStore(suscribirSesion, getUsuarioSesion, () => null);
  const [u, setU] = useState<UsuarioAdmin | null>(null);
  const [fallo, setFallo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claveNueva, setClaveNueva] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState(false);
  const [manual, setManual] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [perfilAsesor, setPerfilAsesor] = useState<{ cargado: boolean; id: string | null }>({ cargado: false, id: null });

  useEffect(() => {
    let vigente = true;
    obtenerUsuario(id)
      .then((x) => vigente && setU(x))
      .catch(() => vigente && setFallo(true));
    return () => {
      vigente = false;
    };
  }, [id]);

  const esAsesor = u?.rol === "asesor";
  const emailU = u?.email;
  useEffect(() => {
    if (!esAsesor || !emailU) return;
    let vigente = true;
    listarAsesoresAdmin("todos")
      .then((l) => vigente && setPerfilAsesor({ cargado: true, id: l.find((a) => a.email === emailU)?.id ?? null }))
      .catch(() => vigente && setPerfilAsesor({ cargado: true, id: null }));
    return () => {
      vigente = false;
    };
  }, [esAsesor, emailU]);

  async function crearPerfil() {
    if (!u) return;
    setError(null);
    try {
      const a = await crearAsesor({ usuarioId: u.id });
      setPerfilAsesor({ cargado: true, id: a.id });
    } catch (e) {
      setError(msg(e));
    }
  }

  const msg = (e: unknown) => (e instanceof ApiError ? e.message : "No pudimos completar la acción. Inténtalo de nuevo.");

  async function alternarActivo() {
    if (!u) return;
    setError(null);
    try {
      setU(await actualizarUsuario(u.id, { activo: !u.activo }));
    } catch (e) {
      setError(msg(e));
    }
  }

  async function restablecer() {
    if (!u) return;
    if (manual && manual.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    setTrabajando(true);
    setError(null);
    try {
      const r = await restablecerPassword(u.id, manual || undefined);
      setClaveNueva(r.passwordTemporal ?? manual);
      setDialogo(false);
      setManual("");
    } catch (e) {
      setError(msg(e));
    } finally {
      setTrabajando(false);
    }
  }

  if (fallo) return <p role="alert" className="text-vino">No pudimos cargar el usuario.</p>;
  if (!u) return <p className="text-[#8A8272]">Cargando…</p>;

  const esUnoMismo = yo?.id === u.id;
  const puedeDesactivar = !u.protegido && !esUnoMismo;
  const puedeRestablecer = !u.protegido || esUnoMismo;

  return (
    <div className="max-w-4xl">
      <Link href="/panel/usuarios" className="text-sm underline">← Usuarios</Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-[26px] font-semibold">
          {u.nombre} {u.protegido && <Badge tono="dorado">cuenta protegida</Badge>} {!u.activo && <Badge>inactivo</Badge>} {esUnoMismo && <Badge>eres tú</Badge>}
        </h1>
        {puedeDesactivar && (
          <button type="button" onClick={alternarActivo} className="rounded-sm border border-negro px-4 py-2 text-sm hover:bg-negro hover:text-texto-claro">
            {u.activo ? "Desactivar cuenta" : "Reactivar cuenta"}
          </button>
        )}
      </div>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      {u.protegido && <p className="mb-4 text-sm text-[#4A4538]">Es la cuenta principal del sistema: no se puede desactivar ni cambiarle el rol, y su contraseña solo la cambia su propietario.</p>}
      {recienCreado && <p role="status" className="mb-4 text-esmeralda">Usuario creado. Entrégale su contraseña inicial y pídele que la guarde.</p>}
      {error && <p role="alert" className="mb-4 text-vino">{error}</p>}
      {claveNueva && (
        <div role="status" className="mb-6 border border-dorado-oscuro bg-white p-4">
          <p className="text-sm font-medium">Nueva contraseña de {u.nombre}:</p>
          <p className="my-2 font-mono text-lg" data-testid="clave-nueva">{claveNueva}</p>
          <p className="text-xs text-[#8A8272]">Cópiala y entrégasela ahora: no se vuelve a mostrar. Sus sesiones abiertas se cerraron.</p>
        </div>
      )}

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold">Datos</h2>
        <FormularioUsuario inicial={u} esUnoMismo={esUnoMismo} onGuardado={setU} />
        {u.rol === "asesor" && perfilAsesor.cargado && (
          <div className="mt-4 max-w-md border border-piedra-oscura bg-white p-3 text-sm">
            {perfilAsesor.id ? (
              <p>Tiene perfil de asesor. <Link href={`/panel/asesores/${perfilAsesor.id}`} className="underline">Ver perfil y horarios</Link></p>
            ) : (
              <>
                <p className="mb-2">Aún no tiene perfil de asesor, así que no aparece al agendar citas.</p>
                <button type="button" onClick={crearPerfil} className="rounded-sm border border-negro px-3 py-1.5 hover:bg-negro hover:text-texto-claro">Crear perfil de asesor</button>
              </>
            )}
          </div>
        )}
      </section>

      {puedeRestablecer && (
        <section>
          <h2 className="mb-1 font-serif text-lg font-semibold">Contraseña</h2>
          <p className="mb-3 text-sm text-[#8A8272]">Si olvidó su clave, genera una nueva. Se cierran sus sesiones abiertas.</p>
          <button type="button" onClick={() => setDialogo(true)} className="rounded-sm border border-negro px-4 py-2 text-sm hover:bg-negro hover:text-texto-claro">Restablecer contraseña</button>
        </section>
      )}

      {dialogo && (
        <Modal titulo="Restablecer contraseña" onCerrar={() => setDialogo(false)}>
          <p className="mb-3 text-sm">Se generará una contraseña temporal para {u.nombre}, o escribe una tú.</p>
          <label className="text-sm">Contraseña (opcional)
            <input value={manual} onChange={(e) => setManual(e.target.value)} maxLength={72} autoComplete="off" className="mt-1 block w-full rounded-sm border border-piedra-oscura px-3 py-2" />
          </label>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" className="text-sm underline" onClick={() => setDialogo(false)}>Volver</button>
            <button type="button" disabled={trabajando} onClick={restablecer} className="rounded-sm bg-negro px-4 py-2 text-sm text-texto-claro disabled:opacity-50">{trabajando ? "Generando…" : manual ? "Guardar contraseña" : "Generar contraseña"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
