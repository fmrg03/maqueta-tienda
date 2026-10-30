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
import { enlaceWhatsApp, HAY_WHATSAPP } from "@/lib/whatsapp";
import { enviarSolicitud, normalizarTelefonoVE } from "@/lib/carrito/solicitud";

type Errores = Partial<Record<"nombre" | "telefono" | "email" | "general", string>>;

function mensajeError(e: unknown): string {
  // Visible en la consola del navegador (F12) para diagnosticar sin adivinar.
  console.error("Error al enviar la consulta:", e);
  if (!(e instanceof ApiError)) {
    // fetch lanza TypeError cuando no hay respuesta: servidor caído, URL
    // equivocada o bloqueo de CORS (CORS_ORIGIN del backend).
    return "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";
  }
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
  const [enviado, setEnviado] = useState<{ nombre: string; items: ItemCarrito[] } | null>(null);

  if (items === null) return null;

  if (enviado) {
    const wa = enlaceWhatsApp(enviado.nombre, enviado.items);
    return (
      <div role="status" className="border border-esmeralda/40 bg-white p-6">
        <h2 className="font-serif text-xl font-semibold">¡Recibimos tu consulta!</h2>
        <p className="mt-2 text-[#4A4538]">
          Nuestro equipo de ventas te escribirá por WhatsApp muy pronto.
        </p>
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-sm border border-negro px-5 py-2.5 text-sm font-medium hover:bg-negro hover:text-texto-claro"
          >
            ¿No se abrió WhatsApp? Ábrelo aquí
          </a>
        )}
        <Link href="/catalogo" className="mt-4 block underline">
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

    // Las dos acciones salen EN PARALELO: se abre WhatsApp con el mensaje ya
    // redactado y, a la vez, se envía la consulta al backend (que avisa por
    // correo a ventas). La ventana se abre aquí, dentro del clic del usuario,
    // antes de cualquier await: si no, el navegador la bloquea como pop-up.
    const urlWa = enlaceWhatsApp(nombre.trim(), items!);
    const ventana = urlWa ? window.open(urlWa, "_blank") : null;
    if (ventana) ventana.opener = null;

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
      const snapshot = items!;
      vaciarCarrito();
      setEnviado({ nombre: nombre.trim(), items: snapshot });
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
          <li key={`${i.tipo}:${i.refId}`} className="flex flex-wrap items-center gap-4 py-4">
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
                  setItems(cambiarCantidadItem(i.tipo, i.refId, Number(e.target.value)))
                }
                className="w-20 border border-piedra-oscura bg-white px-2 py-1.5 font-mono"
              />
            </label>
            <button
              type="button"
              onClick={() => setItems(quitarItem(i.tipo, i.refId))}
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
        <p className="border-l-2 border-dorado-oscuro bg-white/60 px-3 py-2 text-xs text-[#4A4538]">
          {HAY_WHATSAPP ? (
            <>
              Al solicitar la cotización haremos <strong>dos cosas a la vez</strong>: abriremos
              WhatsApp con tu consulta ya escrita (solo te falta pulsar enviar) y enviaremos tu
              consulta por correo a nuestro equipo de ventas.
            </>
          ) : (
            <>Enviaremos tu consulta a nuestro equipo de ventas, que te contactará por WhatsApp.</>
          )}
        </p>
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
