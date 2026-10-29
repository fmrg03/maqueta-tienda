"use client";

import Link from "next/link";
import { useState } from "react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api/client";
import {
  agruparPorDia,
  etiquetaDia,
  etiquetaHora,
  listarFranjas,
  solicitarAsesoria,
  type Asesor,
  type Franja,
} from "@/lib/asesorias/asesorias";
import { normalizarTelefonoVE } from "@/lib/carrito/solicitud";

type Errores = Partial<Record<"nombre" | "telefono" | "email" | "general" | "franja", string>>;

const chip = (activo: boolean) =>
  clsx(
    "cursor-pointer border px-4 py-2 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-dorado",
    activo
      ? "border-dorado-oscuro bg-negro text-texto-claro"
      : "border-piedra-oscura bg-white hover:border-dorado-oscuro",
  );

export function AgendarAsesoria({
  asesores,
  franjasIniciales = null,
}: {
  asesores: Asesor[];
  /** Con un solo asesor, la página ya trae sus horarios desde el servidor. */
  franjasIniciales?: Franja[] | null;
}) {
  const [asesorId, setAsesorId] = useState(asesores.length === 1 ? asesores[0].id : "");
  const [franjas, setFranjas] = useState<Franja[] | null>(franjasIniciales);
  const [cargando, setCargando] = useState(false);
  const [dia, setDia] = useState("");
  const [franjaIso, setFranjaIso] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState<{ fecha: string } | null>(null);

  async function cargarFranjas(id: string) {
    setCargando(true);
    setFranjas(null);
    setDia("");
    setFranjaIso("");
    try {
      setFranjas(await listarFranjas(id));
    } catch {
      setFranjas([]);
      setErrores({ general: "No pudimos cargar los horarios. Inténtalo de nuevo." });
    } finally {
      setCargando(false);
    }
  }

  function elegirAsesor(id: string) {
    setAsesorId(id);
    setErrores({});
    void cargarFranjas(id);
  }

  const dias = franjas ? agruparPorDia(franjas) : [];
  const horas = dias.find((d) => d.dia === dia)?.franjas ?? [];

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const nuevos: Errores = {};
    const tel = normalizarTelefonoVE(telefono);
    if (!franjaIso) nuevos.franja = "Elige un día y una hora.";
    if (nombre.trim().length < 2) nuevos.nombre = "Escribe tu nombre.";
    if (!tel) nuevos.telefono = "Ingresa un teléfono venezolano válido, ej. 0414 1234567.";
    if (email && !/^\S+@\S+\.\S+$/.test(email)) nuevos.email = "Correo no válido.";
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0 || !tel) return;

    setEnviando(true);
    try {
      await solicitarAsesoria({
        clienteNombre: nombre.trim(),
        clienteTelefono: tel,
        ...(email ? { clienteEmail: email.trim() } : {}),
        asesorId,
        fechaHoraLlamada: franjaIso,
      });
      setListo({ fecha: `${etiquetaDia(franjaIso)}, ${etiquetaHora(franjaIso)}` });
    } catch (err) {
      console.error("Error al agendar la llamada:", err);
      if (!(err instanceof ApiError)) {
        setErrores({ general: "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo." });
      } else if (err.statusCode === 409) {
        // Otro cliente se la llevó primero: se refrescan los horarios.
        await cargarFranjas(asesorId);
        setErrores({ general: "Ese horario acaba de ser reservado por otra persona. Elige otro, por favor." });
      } else if (err.statusCode === 429) {
        setErrores({ general: "Demasiados intentos. Por favor espera un rato antes de volver a intentar." });
      } else if (err.statusCode >= 400 && err.statusCode < 500) {
        setErrores({ general: "Revisa los datos e inténtalo de nuevo." });
      } else {
        setErrores({ general: "No pudimos agendar tu llamada. Inténtalo de nuevo en unos minutos." });
      }
    } finally {
      setEnviando(false);
    }
  }

  if (listo) {
    return (
      <div role="status" className="border border-esmeralda/40 bg-white p-6">
        <h2 className="font-serif text-xl font-semibold">¡Llamada agendada!</h2>
        <p className="mt-2 text-[#4A4538]">
          Te llamaremos por WhatsApp el <strong>{listo.fecha}</strong> (hora de Venezuela).
        </p>
        <Link href="/catalogo" className="mt-4 inline-block underline">
          Ver el catálogo
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-8">
      {asesores.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">1. Elige un asesor</legend>
          <div className="flex flex-wrap gap-2">
            {asesores.map((a) => (
              <label key={a.id} className={chip(a.id === asesorId)}>
                <input type="radio" name="asesor" className="sr-only" checked={a.id === asesorId} onChange={() => elegirAsesor(a.id)} />
                {a.nombre}
                {a.especialidad && <span className="ml-1.5 opacity-70">· {a.especialidad}</span>}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {asesorId && (
        <fieldset aria-busy={cargando}>
          <legend className="mb-2 text-sm font-medium">
            {asesores.length > 1 ? "2." : "1."} Elige día y hora{" "}
            <span className="font-normal text-[#8A8272]">(hora de Venezuela)</span>
          </legend>
          {cargando && <p className="text-sm text-[#8A8272]">Cargando horarios…</p>}
          {franjas && franjas.length === 0 && !cargando && (
            <p className="text-sm text-[#8A8272]">
              Este asesor no tiene horarios libres por ahora. Prueba con otro o escríbenos por WhatsApp.
            </p>
          )}
          {dias.length > 0 && (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {dias.map((d) => (
                  <label key={d.dia} className={chip(d.dia === dia)}>
                    <input type="radio" name="dia" className="sr-only" checked={d.dia === dia} onChange={() => { setDia(d.dia); setFranjaIso(""); }} />
                    {d.etiqueta}
                  </label>
                ))}
              </div>
              {horas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {horas.map((h) => (
                    <label key={h.id} className={clsx(chip(h.fechaHora === franjaIso), "font-mono")}>
                      <input type="radio" name="hora" className="sr-only" checked={h.fechaHora === franjaIso} onChange={() => setFranjaIso(h.fechaHora)} />
                      {etiquetaHora(h.fechaHora)}
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
          {errores.franja && <p className="mt-2 text-xs text-vino">{errores.franja}</p>}
        </fieldset>
      )}

      {asesorId && (
        <div className="flex max-w-md flex-col gap-4">
          <h2 className="text-sm font-medium">
            {asesores.length > 1 ? "3." : "2."} Tus datos
          </h2>
          <Input label="Nombre" name="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} error={errores.nombre} autoComplete="name" />
          <Input label="Teléfono (WhatsApp)" name="telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} error={errores.telefono} autoComplete="tel" />
          <Input label="Correo (opcional)" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errores.email} autoComplete="email" />
          {/* Espacio reservado para el widget de Cloudflare Turnstile (captchaToken) */}
          <div data-captcha-slot />
          {errores.general && (
            <p role="alert" className="text-sm text-vino">
              {errores.general}
            </p>
          )}
          <Button type="submit" disabled={enviando}>
            {enviando ? "Agendando…" : "Agendar llamada"}
          </Button>
        </div>
      )}
    </form>
  );
}
