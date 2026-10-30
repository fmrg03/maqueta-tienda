"use client";

import Link from "next/link";
import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getUsuarioSesion, login } from "@/lib/auth/auth";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mensajeDeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.statusCode === 429) return "Demasiados intentos. Espera un minuto e inténtalo de nuevo.";
    if (err.statusCode === 401) return "Correo o contraseña incorrectos.";
    return err.message;
  }
  return "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [errores, setErrores] = useState<{ email?: string; password?: string; general?: string }>({});
  const [cargando, setCargando] = useState(false);

  // Quien ya tiene sesión no necesita ver el formulario.
  useEffect(() => {
    const u = getUsuarioSesion();
    if (u) router.replace(u.rol === "cliente" ? "/" : "/panel");
  }, [router]);

  async function manejarSubmit(evento: FormEvent) {
    evento.preventDefault();
    const nuevos: typeof errores = {};
    if (!EMAIL.test(email.trim())) nuevos.email = "Escribe un correo válido.";
    if (!password) nuevos.password = "Escribe tu contraseña.";
    setErrores(nuevos);
    if (nuevos.email || nuevos.password) return;

    setCargando(true);
    try {
      const usuario = await login(email.trim().toLowerCase(), password);
      // El destino post-login depende del rol — el panel se arma
      // dinámicamente según qué puede ver cada quien (ver
      // docs/fase1-ux-ui.md, sección 2.2 nota de permisos).
      router.push(usuario.rol === "cliente" ? "/" : "/panel");
    } catch (err) {
      setErrores({ general: mensajeDeError(err) });
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
        <p className="text-sm text-texto-secundario">Acceso para el equipo</p>

        <form
          onSubmit={manejarSubmit}
          noValidate
          className="mt-6 flex flex-col gap-4 rounded-sm bg-piedra p-6"
        >
          <Input
            label="Correo"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            error={errores.email}
          />
          <div className="flex flex-col gap-1.5">
            <Input
              label="Contraseña"
              type={verClave ? "text" : "password"}
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              error={errores.password}
            />
            <label className="flex items-center gap-2 text-xs text-[#4A4538]">
              <input type="checkbox" checked={verClave} onChange={(e) => setVerClave(e.target.checked)} />
              Mostrar contraseña
            </label>
          </div>

          {errores.general && (
            <p role="alert" className="text-sm text-vino">
              {errores.general}
            </p>
          )}

          <Button type="submit" disabled={cargando} className="mt-2">
            {cargando ? "Ingresando…" : "Ingresar"}
          </Button>
          <p className="text-xs text-[#8A8272]">¿Olvidaste tu contraseña? Pídele al administrador que te genere una nueva.</p>
        </form>

        <Link href="/" className="mt-5 inline-block text-sm text-texto-secundario underline hover:text-dorado-claro">
          ← Volver al sitio
        </Link>
      </div>
    </div>
  );
}
