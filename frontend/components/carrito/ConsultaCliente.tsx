"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api/client";
import {
  cambiarCantidadItem,
  getCarrito,
  quitarItem,
  vaciarCarrito,
  type ItemCarrito,
} from "@/lib/carrito/carrito-store";
import { enviarSolicitud, normalizarTelefonoVE } from "@/lib/carrito/solicitud";

type Errores = Partial<Record<"nombre" | "telefono" | "email" | "general", string>>;

function mensajeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.statusCode === 429)
      return "Demasiados intentos. Por favor espera un rato antes de volver a enviar tu consulta.";
    if (e.statusCode >= 400 && e.statusCode < 500)
      return "Revisa los datos e inténtalo de nuevo.";
  }
  return "No pudimos enviar tu consulta. Inténtalo de nuevo en unos minutos.";
}

export function ConsultaCliente() {
  // true solo en el cliente: evita leer localStorage durante el SSR.
  const montado = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [editados, setItems] = useState<ItemCarrito[] | null>(null);
  const items = editados ?? (montado ? getCarrito() : null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  if (items === null) return null;

  if (enviado) {
    return (
      <div role="status" className="border border-esmeralda/40 bg-white p-6">
        <h2 className="font-serif text-xl font-semibold">¡Recibimos tu consulta!</h2>
        <p className="mt-2 text-[#4A4538]">
          Nuestro equipo de ventas te escribirá por WhatsApp muy pronto.
        </p>
        <Link href="/catalogo" className="mt-4 inline-block underline">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-[#8A8272]">
        Tu consulta está vacía.{" "}
        <Link href="/catalogo" className="underline">
          Explora el catálogo
        </Link>
      </p>
    );
  }

  const total = items.reduce((s, i) => s + i.precioVenta * i.cantidad, 0);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const nuevos: Errores = {};
    const tel = normalizarTelefonoVE(telefono);
    if (nombre.trim().length < 2) nuevos.nombre = "Escribe tu nombre.";
    if (!tel) nuevos.telefono = "Ingresa un teléfono venezolano válido, ej. 0414 1234567.";
    if (email && !/^\S+@\S+\.\S+$/.test(email)) nuevos.email = "Correo no válido.";
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0 || !tel) return;

    setEnviando(true);
    try {
      await enviarSolicitud(
        {
          clienteNombre: nombre.trim(),
          clienteTelefono: tel,
          ...(email ? { clienteEmail: email.trim() } : {}),
        },
        items!,
      );
      vaciarCarrito();
      setEnviado(true);
    } catch (err) {
      setErrores({ general: mensajeError(err) });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_340px]">
      <ul className="divide-y divide-piedra-oscura border-y border-piedra-oscura">
        {items.map((i) => (
          <li key={i.varianteId} className="flex flex-wrap items-center gap-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{i.nombre}</p>
              <p className="text-sm text-[#8A8272]">{i.presentacion}</p>
              <p className="font-mono text-sm text-dorado-oscuro">
                ${i.precioVenta.toFixed(2)} c/u
              </p>
            </div>
            <label className="text-sm">
              <span className="sr-only">Cantidad de {i.nombre}</span>
              <input
                type="number"
                min={1}
                value={i.cantidad}
                onChange={(e) =>
                  setItems(cambiarCantidadItem(i.varianteId, Number(e.target.value)))
                }
                className="w-20 border border-piedra-oscura bg-white px-2 py-1.5 font-mono"
              />
            </label>
            <button
              type="button"
              onClick={() => setItems(quitarItem(i.varianteId))}
              className="text-sm text-vino underline"
            >
              Quitar
            </button>
          </li>
        ))}
        <li className="flex justify-between py-4 font-mono">
          <span>Total de referencia</span>
          <span>${total.toFixed(2)}</span>
        </li>
      </ul>

      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <h2 className="font-serif text-lg font-semibold">¿Cómo te contactamos?</h2>
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
          {enviando ? "Enviando…" : "Solicitar cotización"}
        </Button>
      </form>
    </div>
  );
}
