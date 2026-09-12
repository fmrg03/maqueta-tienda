"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth/auth";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function manejarSubmit(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const usuario = await login(email, password);
      // El destino post-login depende del rol — el panel se arma
      // dinámicamente según qué puede ver cada quien (ver
      // docs/fase1-ux-ui.md, sección 2.2 nota de permisos).
      router.push(usuario.rol === "cliente" ? "/" : "/panel");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No pudimos iniciar sesión",
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-negro px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-2xl font-semibold text-dorado-claro">
          Revestimiento Élite RY
        </h1>
        <div className="my-4 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />

        <form
          onSubmit={manejarSubmit}
          className="mt-6 flex flex-col gap-4 rounded-sm bg-piedra p-6"
        >
          <Input
            label="Email"
            type="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            label="Contraseña"
            type="password"
            name="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {error && (
            <p role="alert" className="text-sm text-vino">
              {error}
            </p>
          )}

          <Button type="submit" disabled={cargando} className="mt-2">
            {cargando ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
