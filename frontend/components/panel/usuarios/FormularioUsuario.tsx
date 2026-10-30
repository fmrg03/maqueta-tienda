"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api/client";
import type { RolUsuario } from "@/lib/auth/auth";
import { actualizarUsuario, crearUsuario, ROLES_PANEL, type UsuarioAdmin } from "@/lib/panel/usuarios";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FormularioUsuario({
  inicial,
  esUnoMismo,
  onGuardado,
}: {
  inicial?: UsuarioAdmin;
  esUnoMismo?: boolean;
  onGuardado?: (u: UsuarioAdmin) => void;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [email, setEmail] = useState(inicial?.email ?? "");
  const [telefono, setTelefono] = useState(inicial?.telefono ?? "");
  const [rol, setRol] = useState<RolUsuario>(inicial?.rol ?? "ventas");
  const [password, setPassword] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  const rolBloqueado = !!inicial && (inicial.protegido || esUnoMismo);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setOk(false);
    const err: Record<string, string> = {};
    if (nombre.trim().length < 2) err.nombre = "Escribe el nombre.";
    if (!EMAIL.test(email.trim())) err.email = "Escribe un correo válido.";
    if (!inicial && password.length < 8) err.password = "La contraseña debe tener al menos 8 caracteres.";
    setErrores(err);
    if (Object.keys(err).length) return;
    setGuardando(true);
    try {
      const base = { nombre: nombre.trim(), email: email.trim().toLowerCase(), rol, telefono: telefono.trim() || undefined };
      if (inicial) {
        const u = await actualizarUsuario(inicial.id, { ...base, ...(rolBloqueado ? { rol: undefined } : {}) });
        setOk(true);
        onGuardado?.(u);
      } else {
        const u = await crearUsuario({ ...base, password });
        router.push(`/panel/usuarios/${u.id}?nuevo=1`);
        return;
      }
    } catch (e2) {
      console.error(e2);
      setErrores({ general: e2 instanceof ApiError ? e2.message : "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex max-w-md flex-col gap-4">
      <Input label="Nombre" name="nombre" value={nombre} maxLength={150} onChange={(e) => setNombre(e.target.value)} error={errores.nombre} />
      <Input label="Correo" name="email" type="email" value={email} maxLength={150} onChange={(e) => setEmail(e.target.value)} error={errores.email} />
      <Input label="Teléfono (opcional)" name="telefono" value={telefono} maxLength={30} placeholder="0414 1234567" onChange={(e) => setTelefono(e.target.value)} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="rol-usuario" className="text-sm font-medium">Rol</label>
        <select id="rol-usuario" value={rol} disabled={rolBloqueado} onChange={(e) => setRol(e.target.value as RolUsuario)} className="rounded-sm border border-piedra-oscura bg-white px-3 py-2.5 text-sm disabled:opacity-60">
          {ROLES_PANEL.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {rolBloqueado && <p className="text-xs text-[#8A8272]">{inicial?.protegido ? "La cuenta protegida no puede cambiar de rol." : "No puedes cambiar tu propio rol."}</p>}
        <p className="text-xs text-[#8A8272]">Administrador: todo el panel. Ventas: solicitudes de carrito y catálogo. Asesor: sus citas. Cliente: sin acceso al panel.</p>
      </div>
      {!inicial && (
        <Input label="Contraseña inicial" name="password" type="text" autoComplete="off" value={password} maxLength={72} onChange={(e) => setPassword(e.target.value)} error={errores.password} />
      )}
      {errores.general && <p role="alert" className="text-sm text-vino">{errores.general}</p>}
      {ok && <p role="status" className="text-sm text-esmeralda">Cambios guardados.</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={guardando}>{guardando ? "Guardando…" : inicial ? "Guardar cambios" : "Crear usuario"}</Button>
        {!inicial && <Link href="/panel/usuarios" className="rounded-sm border border-negro px-6 py-3 text-sm font-medium hover:bg-negro hover:text-texto-claro">Cancelar</Link>}
      </div>
    </form>
  );
}
