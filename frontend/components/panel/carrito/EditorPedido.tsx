"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api/client";
import { etiquetaVariante, listarMateriales, type Material } from "@/lib/catalogo/catalogo";
import { listarCombos, type Combo } from "@/lib/catalogo/combos";
import {
  cambiarEstado,
  dinero,
  enlaceWhatsAppCliente,
  enviarDetalle,
  ESTADOS_ABIERTOS,
  guardarItems,
  nombreItem,
  obtenerSolicitud,
  presentacionItem,
  totalDeItems,
  type ItemEdicion,
  type Solicitud,
} from "@/lib/panel/carrito";
import { DialogoCancelar, DialogoCierre } from "./Dialogos";

export interface Aviso {
  texto: string;
  /** Enlace de respaldo si el navegador bloqueó la ventana de WhatsApp. */
  enlace?: string;
}

interface Linea {
  clave: string;
  tipo: "variante" | "combo" | "material";
  refId: string;
  nombre: string;
  presentacion: string;
  cantidad: string;
  precio: string;
  stock?: number;
}

let contador = 0;
const nuevaClave = () => `l${++contador}`;

function lineasIniciales(s: Solicitud): Linea[] {
  return s.items.map((i) => {
    const tipo = i.variante ? "variante" : i.combo ? "combo" : "material";
    return {
      clave: i.id,
      tipo,
      refId: (i.variante?.id ?? i.combo?.id ?? i.material?.id) as string,
      nombre: nombreItem(i),
      presentacion: presentacionItem(i),
      cantidad: String(i.cantidad),
      precio: i.precioUnitario === null ? "" : i.precioUnitario.toFixed(2),
      stock: i.variante?.stock,
    };
  });
}

const firma = (lineas: Linea[], total: string) =>
  JSON.stringify([lineas.map((l) => [l.tipo, l.refId, l.cantidad, l.precio]), total.trim()]);

const aEntero = (t: string) => (/^\d+$/.test(t.trim()) && Number(t) >= 1 ? Number(t) : null);
const aPrecio = (t: string) => (t.trim() !== "" && !Number.isNaN(Number(t)) && Number(t) >= 0 ? Number(t) : null);

function mensajeError(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return "No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.";
}

export function EditorPedido({
  solicitud,
  esAdmin,
  onActualizada,
}: {
  solicitud: Solicitud;
  esAdmin: boolean;
  onActualizada: (s: Solicitud, aviso?: Aviso) => void;
}) {
  const abierta = ESTADOS_ABIERTOS.includes(solicitud.estado);

  const [lineas, setLineas] = useState<Linea[]>(() => lineasIniciales(solicitud));
  const [totalTexto, setTotalTexto] = useState(solicitud.totalFinal !== null ? solicitud.totalFinal.toFixed(2) : "");
  const [base] = useState(() => firma(lineasIniciales(solicitud), solicitud.totalFinal !== null ? solicitud.totalFinal.toFixed(2) : ""));
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<"cierre" | "cancelar" | null>(null);

  const [materiales, setMateriales] = useState<Material[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [agregar, setAgregar] = useState("");

  useEffect(() => {
    if (!abierta) return;
    let vigente = true;
    Promise.all([listarMateriales(1, 200), listarCombos()])
      .then(([m, c]) => {
        if (!vigente) return;
        setMateriales(m.items);
        setCombos(c);
      })
      .catch(() => undefined); // sin catálogo no se pueden agregar ítems, pero sí gestionar
    return () => {
      vigente = false;
    };
  }, [abierta]);

  const sucio = firma(lineas, totalTexto) !== base;
  const parseadas = lineas.map((l) => ({ cantidad: aEntero(l.cantidad), precio: aPrecio(l.precio) }));
  const hayInvalidas = parseadas.some((p) => p.cantidad === null) || lineas.length === 0;
  const { total: suma, parcial } = totalDeItems(
    lineas.map((l, i) => ({ cantidad: parseadas[i].cantidad ?? 0, precioUnitario: parseadas[i].precio })),
  );
  const totalNum = totalTexto.trim() === "" ? null : aPrecio(totalTexto);
  const totalMostrado = totalNum ?? suma;
  const genericos = lineas.filter((l) => l.tipo === "material");

  const opciones = useMemo(
    () =>
      materiales.flatMap((m) =>
        m.variantes.map((v) => ({
          valor: `v:${v.id}`,
          etiqueta: `${m.nombre} — ${etiquetaVariante(v)} · ${dinero(v.precioVenta)} · stock ${v.stock}`,
        })),
      ),
    [materiales],
  );

  function agregarLinea(valor: string) {
    if (!valor) return;
    const [tipo, id] = valor.split(":");
    if (tipo === "v") {
      const m = materiales.find((x) => x.variantes.some((v) => v.id === id));
      const v = m?.variantes.find((x) => x.id === id);
      if (!m || !v) return;
      setLineas((ls) => [
        ...ls,
        {
          clave: nuevaClave(),
          tipo: "variante",
          refId: v.id,
          nombre: m.nombre,
          presentacion: etiquetaVariante(v),
          cantidad: "1",
          precio: v.precioVenta.toFixed(2),
          stock: v.stock,
        },
      ]);
    } else {
      const c = combos.find((x) => x.id === id);
      if (!c) return;
      setLineas((ls) => [
        ...ls,
        { clave: nuevaClave(), tipo: "combo", refId: c.id, nombre: `Combo: ${c.nombre}`, presentacion: "", cantidad: "1", precio: c.precioCombo.toFixed(2) },
      ]);
    }
    setAgregar("");
  }

  const cambiar = (clave: string, campo: "cantidad" | "precio", valor: string) =>
    setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, [campo]: valor } : l)));

  async function ejecutar<T>(nombre: string, fn: () => Promise<T>): Promise<T | undefined> {
    setOcupado(nombre);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      console.error(e);
      setError(mensajeError(e));
      return undefined;
    } finally {
      setOcupado(null);
    }
  }

  async function guardar() {
    const items: ItemEdicion[] = lineas.map((l, i) => {
      const it: ItemEdicion = { cantidad: parseadas[i].cantidad as number };
      if (l.tipo === "variante") it.varianteId = l.refId;
      else if (l.tipo === "combo") it.comboId = l.refId;
      else it.materialId = l.refId;
      if (parseadas[i].precio !== null) it.precioUnitario = parseadas[i].precio as number;
      return it;
    });
    const totalFinal = totalTexto.trim() === "" ? (solicitud.totalFinal !== null ? null : undefined) : (totalNum ?? undefined);
    if (totalTexto.trim() !== "" && totalNum === null) {
      setError("El total acordado no es válido.");
      return;
    }
    const s = await ejecutar("guardar", () => guardarItems(solicitud.id, items, totalFinal));
    if (s) onActualizada(s, { texto: "Cambios guardados. Recuerda enviarle el detalle actualizado al cliente." });
  }

  async function enviar() {
    // La ventana se abre en el clic (antes del await) para que el navegador no la bloquee.
    const ventana = window.open("", "_blank");
    const r = await ejecutar("enviar", () => enviarDetalle(solicitud.id));
    if (!r) {
      ventana?.close();
      return;
    }
    const enlace = enlaceWhatsAppCliente(r.telefono, r.mensaje);
    if (ventana) ventana.location.href = enlace;
    const correo = r.emailEnviado ? " También se envió por correo." : solicitud.clienteEmail ? " (El correo no pudo enviarse.)" : "";
    const s = await obtenerSolicitud(solicitud.id);
    onActualizada(s, {
      texto: ventana
        ? `Se abrió WhatsApp con el detalle: envía el mensaje desde ahí.${correo}`
        : `El navegador bloqueó la ventana de WhatsApp.${correo}`,
      enlace: ventana ? undefined : enlace,
    });
  }

  async function mover(estado: "contactado" | "pago_en_verificacion") {
    const s = await ejecutar(estado, () => cambiarEstado(solicitud.id, estado));
    if (s) onActualizada(s);
  }

  const motivoNoCerrar = !abierta
    ? null
    : lineas.length === 0
      ? "El pedido no tiene ítems."
      : sucio
        ? "Guarda los cambios antes de cerrar."
        : solicitud.modificadaDesdeEnvio
          ? "Envía el detalle actualizado al cliente antes de cerrar."
          : genericos.length > 0
            ? "Elige la presentación de los materiales marcados antes de cerrar."
            : null;

  return (
    <div>
      {solicitud.estado === "pendiente_stock" && (
        <section role="status" className="mb-6 border-l-4 border-vino bg-white p-4">
          <h2 className="font-semibold text-vino">Pago recibido, pero falta mercancía</h2>
          <p className="mt-1 text-sm text-[#4A4538]">
            No se descontó nada del inventario.
            {solicitud.montoCobrado !== null && ` El cliente pagó ${dinero(solicitud.montoCobrado)}.`} Contáctalo y elige: esperar la
            mercancía y reintentar el cierre, ajustar el pedido a lo disponible, o cancelar y reembolsar.
          </p>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-xs text-[#8A8272]">
                <th className="py-1 font-normal">SKU</th>
                <th className="py-1 text-right font-normal">Pedido</th>
                <th className="py-1 text-right font-normal">Disponible</th>
                <th className="py-1 text-right font-normal">Faltan</th>
              </tr>
            </thead>
            <tbody>
              {(solicitud.faltantes ?? []).map((f) => (
                <tr key={f.varianteId} className="border-t border-piedra-oscura">
                  <td className="py-1 font-mono">{f.sku}</td>
                  <td className="py-1 text-right font-mono">{f.requerido}</td>
                  <td className="py-1 text-right font-mono">{f.disponible}</td>
                  <td className="py-1 text-right font-mono font-semibold text-vino">{f.faltan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {solicitud.estado === "cerrada" && (
        <section className="mb-6 border-l-4 border-esmeralda bg-white p-4 text-sm">
          <h2 className="font-semibold text-esmeralda">Venta cerrada</h2>
          <p className="mt-1 text-[#4A4538]">
            Cobrado {solicitud.montoCobrado !== null ? dinero(solicitud.montoCobrado) : "—"}
            {solicitud.metodoPago && ` · ${solicitud.metodoPago.replace("_", " ")}`}
            {solicitud.referenciaPago && ` · ref. ${solicitud.referenciaPago}`}. El inventario ya fue descontado.
          </p>
        </section>
      )}

      {solicitud.estado === "cancelada" && (
        <section className="mb-6 border-l-4 border-piedra-oscura bg-white p-4 text-sm">
          <h2 className="font-semibold">Solicitud cancelada</h2>
          <p className="mt-1 text-[#4A4538]">
            {solicitud.motivoCancelacion}
            {solicitud.montoReembolsado !== null && ` · Reembolsado ${dinero(solicitud.montoReembolsado)}`}
          </p>
        </section>
      )}

      {abierta && (sucio || solicitud.modificadaDesdeEnvio) && (
        <p role="status" className="mb-4 bg-dorado-claro/20 px-3 py-2 text-sm text-dorado-oscuro">
          {sucio
            ? "Tienes cambios sin guardar."
            : "El pedido cambió y el cliente aún no ha recibido el detalle actualizado."}
        </p>
      )}

      <section aria-labelledby="pedido">
        <h2 id="pedido" className="mb-3 font-serif text-lg font-semibold">Pedido</h2>

        <div className="overflow-x-auto bg-white">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-piedra-oscura text-left font-mono text-xs text-[#8A8272]">
                <th className="p-3 font-normal">Producto</th>
                <th className="p-3 font-normal">Cant.</th>
                <th className="p-3 font-normal">Precio c/u</th>
                <th className="p-3 text-right font-normal">Subtotal</th>
                {abierta && <th className="p-3"><span className="sr-only">Quitar</span></th>}
              </tr>
            </thead>
            <tbody>
              {lineas.map((l, i) => {
                const p = parseadas[i];
                const subtotal = p.cantidad !== null && p.precio !== null ? p.cantidad * p.precio : null;
                const falta = l.stock !== undefined && p.cantidad !== null && p.cantidad > l.stock;
                return (
                  <tr key={l.clave} className="border-b border-piedra-oscura last:border-0 align-top">
                    <td className="p-3">
                      <p className="font-medium">{l.nombre}</p>
                      {l.presentacion && (
                        <p className={l.tipo === "material" ? "text-xs text-vino" : "text-xs text-[#8A8272]"}>{l.presentacion}</p>
                      )}
                      {l.stock !== undefined && (
                        <p className={`font-mono text-xs ${falta ? "text-vino" : "text-[#8A8272]"}`}>
                          stock {l.stock}
                          {falta && " · no alcanza"}
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      {abierta ? (
                        <input
                          aria-label={`Cantidad de ${l.nombre}`}
                          inputMode="numeric"
                          value={l.cantidad}
                          onChange={(e) => cambiar(l.clave, "cantidad", e.target.value)}
                          className={`w-20 rounded-sm border bg-white px-2 py-1.5 font-mono ${p.cantidad === null ? "border-vino" : "border-piedra-oscura"}`}
                        />
                      ) : (
                        <span className="font-mono">{l.cantidad}</span>
                      )}
                    </td>
                    <td className="p-3">
                      {abierta ? (
                        <input
                          aria-label={`Precio unitario de ${l.nombre}`}
                          inputMode="decimal"
                          value={l.precio}
                          placeholder="a confirmar"
                          onChange={(e) => cambiar(l.clave, "precio", e.target.value)}
                          className="w-24 rounded-sm border border-piedra-oscura bg-white px-2 py-1.5 font-mono"
                        />
                      ) : (
                        <span className="font-mono">{p.precio !== null ? dinero(p.precio) : "—"}</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono">{subtotal !== null ? dinero(subtotal) : "—"}</td>
                    {abierta && (
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setLineas((ls) => ls.filter((x) => x.clave !== l.clave))}
                          aria-label={`Quitar ${l.nombre}`}
                          className="text-vino underline"
                        >
                          Quitar
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {abierta && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label htmlFor="agregar" className="text-sm font-medium">Agregar producto</label>
            <select
              id="agregar"
              value={agregar}
              onChange={(e) => agregarLinea(e.target.value)}
              className="min-w-0 max-w-full flex-1 rounded-sm border border-piedra-oscura bg-white px-3 py-2 text-sm sm:max-w-md"
            >
              <option value="">{opciones.length + combos.length === 0 ? "Cargando catálogo…" : "Elegir…"}</option>
              {opciones.length > 0 && (
                <optgroup label="Materiales">
                  {opciones.map((o) => (
                    <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
                  ))}
                </optgroup>
              )}
              {combos.length > 0 && (
                <optgroup label="Combos">
                  {combos.map((c) => (
                    <option key={c.id} value={`c:${c.id}`}>{`${c.nombre} · ${dinero(c.precioCombo)}`}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}

        {genericos.length > 0 && abierta && (
          <p className="mt-3 text-sm text-vino">
            {genericos.map((g) => g.nombre).join(", ")}: el cliente no eligió presentación. Quita ese ítem y agrega la presentación concreta.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          {abierta ? (
            <div className="w-48">
              <Input
                label="Total acordado (opcional)"
                name="total"
                inputMode="decimal"
                placeholder={suma.toFixed(2)}
                value={totalTexto}
                onChange={(e) => setTotalTexto(e.target.value)}
              />
            </div>
          ) : (
            <span />
          )}
          <p className="text-right">
            <span className="text-sm text-[#8A8272]">Total{totalNum !== null ? " acordado" : ""}</span>
            <br />
            <strong className="font-mono text-xl">{dinero(totalMostrado)}</strong>
            {parcial && totalNum === null && <span className="block text-xs text-vino">hay ítems sin precio</span>}
          </p>
        </div>
      </section>

      {error && <p role="alert" className="mt-4 text-vino">{error}</p>}

      {abierta && (
        <section aria-label="Acciones" className="mt-6 flex flex-wrap items-center gap-3">
          <Button variante="secundario" onClick={guardar} disabled={!sucio || hayInvalidas || ocupado !== null}>
            {ocupado === "guardar" ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Button variante="secundario" onClick={enviar} disabled={sucio || ocupado !== null}>
            {ocupado === "enviar" ? "Enviando…" : "Enviar detalle al cliente"}
          </Button>
          {solicitud.estado === "nueva" && (
            <Button variante="secundario" onClick={() => mover("contactado")} disabled={ocupado !== null}>
              Marcar contactado
            </Button>
          )}
          {(solicitud.estado === "nueva" || solicitud.estado === "contactado") && (
            <Button variante="secundario" onClick={() => mover("pago_en_verificacion")} disabled={ocupado !== null}>
              Pago en verificación
            </Button>
          )}
          <Button onClick={() => setDialogo("cierre")} disabled={motivoNoCerrar !== null || ocupado !== null}>
            {solicitud.estado === "pendiente_stock" ? "Reintentar cierre" : "Cerrar venta"}
          </Button>
          <button onClick={() => setDialogo("cancelar")} className="text-sm text-vino underline">
            Cancelar solicitud
          </button>
          {motivoNoCerrar && <p className="basis-full text-sm text-[#8A8272]">{motivoNoCerrar}</p>}
        </section>
      )}

      {solicitud.estado === "cerrada" && esAdmin && (
        <section className="mt-6">
          <button onClick={() => setDialogo("cancelar")} className="text-sm text-vino underline">
            Anular venta (repone el inventario)
          </button>
        </section>
      )}

      {dialogo === "cierre" && (
        <DialogoCierre
          solicitud={solicitud}
          total={totalMostrado}
          onCerrar={() => setDialogo(null)}
          onResultado={(s) => {
            setDialogo(null);
            onActualizada(
              s,
              s.estado === "pendiente_stock"
                ? { texto: "El pago quedó registrado, pero falta mercancía: la solicitud quedó pendiente por stock." }
                : { texto: "Venta cerrada: se descontó el inventario y se registró el ingreso." },
            );
          }}
        />
      )}
      {dialogo === "cancelar" && (
        <DialogoCancelar
          solicitud={solicitud}
          onCerrar={() => setDialogo(null)}
          onResultado={(s) => {
            setDialogo(null);
            onActualizada(s, { texto: solicitud.estado === "cerrada" ? "Venta anulada y stock repuesto." : "Solicitud cancelada." });
          }}
        />
      )}
    </div>
  );
}

