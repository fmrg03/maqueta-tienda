"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError, apiFetch } from "@/lib/api/client";
import { logout } from "@/lib/auth/auth";

export function CambiarPassword() {
  const router = useRouter();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repite, setRepite] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!actual) err.actual = "Escribe tu contraseña actual.";
    if (nueva.length < 8) err.nueva = "La contraseña nueva debe tener al menos 8 caracteres.";
    if (repite !== nueva) err.repite = "No coincide con la contraseña nueva.";
    setErrores(err);
    if (Object.keys(err).length) return;
    setEnviando(true);
    try {
      await apiFetch("/api/v1/auth/cambiar-password", { method: "POST", body: JSON.stringify({ actual, nueva }) });
      setListo(true);
    } catch (e2) {
      console.error(e2);
      setErrores({ general: e2 instanceof ApiError ? e2.message : "No pudimos cambiar la contraseña. Inténtalo de nuevo." });
    } finally {
      setEnviando(false);
    }
  }

  async function volverAEntrar() {
    await logout();
    router.replace("/login");
  }

  if (listo) {
    return (
      <div role="status" className="max-w-md">
        <p className="mb-4 text-esmeralda">Contraseña actualizada. Por seguridad se cerraron tus sesiones: vuelve a ingresar con la nueva.</p>
        <Button onClick={volverAEntrar}>Ir a iniciar sesión</Button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="flex max-w-md flex-col gap-4">
      <Input label="Contraseña actual" name="actual" type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} error={errores.actual} />
      <Input label="Contraseña nueva" name="nueva" type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} error={errores.nueva} />
      <Input label="Repite la contraseña nueva" name="repite" type="password" autoComplete="new-password" value={repite} onChange={(e) => setRepite(e.target.value)} error={errores.repite} />
      {errores.general && <p role="alert" className="text-sm text-vino">{errores.general}</p>}
      <div><Button type="submit" disabled={enviando}>{enviando ? "Guardando…" : "Cambiar contraseña"}</Button></div>
    </form>
  );
}
