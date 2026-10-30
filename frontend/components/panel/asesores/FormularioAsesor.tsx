"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api/client";
import { crearAsesor } from "@/lib/panel/asesores";

type Campo = "nombre" | "email" | "password" | "telefono" | "general";

export function FormularioAsesor() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telefono, setTelefono] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [guardando, setGuardando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const n: typeof errores = {};
    if (nombre.trim().length < 2) n.nombre = "Escribe el nombre completo.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) n.email = "Escribe un correo válido.";
    if (password.length < 8) n.password = "La contraseña debe tener al menos 8 caracteres.";
    setErrores(n);
    if (Object.keys(n).length) return;

    setGuardando(true);
    try {
      const a = await crearAsesor({
        nombre: nombre.trim(),
        email: email.trim(),
        password,
        telefono: telefono.trim() || undefined,
        especialidad: especialidad.trim() || undefined,
      });
      router.push(`/panel/asesores/${a.id}?nuevo=1`);
    } catch (err) {
      console.error(err);
      const m = err instanceof ApiError ? err.message : "No pudimos crear el asesor. Revisa tu conexión e inténtalo de nuevo.";
      if (err instanceof ApiError && err.statusCode === 409) setErrores({ email: "Ya existe una cuenta con ese correo." });
      else if (err instanceof ApiError && err.statusCode === 400 && /tel/i.test(m)) setErrores({ telefono: "Escribe un teléfono venezolano válido (ej. 0412 1234567)." });
      else setErrores({ general: m });
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex max-w-md flex-col gap-4">
      <Input label="Nombre completo" name="nombre" value={nombre} maxLength={150} onChange={(e) => setNombre(e.target.value)} error={errores.nombre} autoComplete="off" />
      <Input label="Correo (con el que entrará al panel)" name="email" type="email" value={email} maxLength={150} onChange={(e) => setEmail(e.target.value)} error={errores.email} autoComplete="off" />
      <Input label="Contraseña inicial" name="password" type="text" value={password} maxLength={72} onChange={(e) => setPassword(e.target.value)} error={errores.password} autoComplete="off" />
      <p className="-mt-2 text-xs text-[#8A8272]">Anótala y pásasela al asesor; es la que usará para entrar al panel.</p>
      <Input label="Teléfono (opcional)" name="telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} error={errores.telefono} autoComplete="off" />
      <Input label="Especialidad (opcional, la ve el cliente)" name="especialidad" value={especialidad} maxLength={150} placeholder="Ej. Pisos y revestimientos" onChange={(e) => setEspecialidad(e.target.value)} />
      {errores.general && <p role="alert" className="text-sm text-vino">{errores.general}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={guardando}>{guardando ? "Creando…" : "Crear asesor"}</Button>
        <Link href="/panel/asesores" className="rounded-sm border border-negro px-6 py-3 text-sm font-medium hover:bg-negro hover:text-texto-claro">Cancelar</Link>
      </div>
    </form>
  );
}
