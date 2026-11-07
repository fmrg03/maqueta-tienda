"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PrecioBs } from "@/components/ui/PrecioBs";
import { ApiError } from "@/lib/api/client";
import { etiquetaVariante, listarMateriales, type Material } from "@/lib/catalogo/catalogo";
import { listarCombos, type Combo } from "@/lib/catalogo/combos";
import {
  cambiarEstado,
  dinero,
  enlaceWhatsAppCliente,
  enviarDetalle,
  ESTADOS_ABIERTOS,
  ETIQUETA_METODO,
  guardarItems,
  registrarCostoServicios,
  nombreItem,
  obtenerSolicitud,
  presentacionItem,
  totalDeItems,
  type ItemEdicion,
  type ServicioEdicion,
  type Solicitud,
} from "@/lib/panel/carrito";
import { DialogoServicio, type DatosLineaServicio } from "@/components/panel/presupuestos/DialogoServicio";
import { DialogoCancelar } from "./Dialogos";
import { PanelCobro } from "./PanelCobro";

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

// Servicios (mano de obra): cantidad y precio como texto para poder escribir decimales.
interface LineaServicio {
  clave: string;
  servicioId?: string | null;
  descripcion: string;
  unidad: string;
  cantidad: string;
  precio: string;
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

function serviciosIniciales(s: Solicitud): LineaServicio[] {
  return (s.servicios ?? []).map((v) => ({
    clave: v.id ?? nuevaClave(),
    servicioId: v.servicioId,
    descripcion: v.descripcion,
    unidad: v.unidad,
    cantidad: String(v.cantidad),
    precio: v.precioUnitario.toFixed(2),
  }));
}

const firma = (lineas: Linea[], total: string, servicios: LineaServicio[]) =>
  JSON.stringify([
    lineas.map((l) => [l.tipo, l.refId, l.cantidad, l.precio]),
    total.trim(),
    servicios.map((v) => [v.descripcion, v.unidad, v.cantidad, v.precio]),
  ]);
const aDecimalPositivo = (t: string) => {
  const n = Number(t.trim().replace(",", "."));
  return t.trim() !== "" && !Number.isNaN(n) && n > 0 ? n : null;
};

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
  const [costoTexto, setCostoTexto] = useState(solicitud.costoServicios !== null ? solicitud.costoServicios.toFixed(2) : "");
  const [costoError, setCostoError] = useState<string | null>(null);
  const [servicios, setServicios] = useState<LineaServicio[]>(() => serviciosIniciales(solicitud));
  const [dialogoServicio, setDialogoServicio] = useState(false);
  const [base] = useState(() =>
    firma(lineasIniciales(solicitud), solicitud.totalFinal !== null ? solicitud.totalFinal.toFixed(2) : "", serviciosIniciales(solicitud)),
  );
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<"cancelar" | null>(null);

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

  const sucio = firma(lineas, totalTexto, servicios) !== base;
  const parseadas = lineas.map((l) => ({ cantidad: aEntero(l.cantidad), precio: aPrecio(l.precio) }));
  const parseadosServ = servicios.map((v) => ({
    descripcion: v.descripcion.trim(),
    cantidad: aDecimalPositivo(v.cantidad),
    precio: aPrecio(v.precio.replace(",", ".")),
  }));
  const hayInvalidas =
    parseadas.some((p) => p.cantidad === null) ||
    parseadosServ.some((v) => v.cantidad === null || v.precio === null || v.descripcion.length < 2) ||
    lineas.length + servicios.length === 0;
  const { total: suma, parcial } = totalDeItems([
    ...lineas.map((l, i) => ({ cantidad: parseadas[i].cantidad ?? 0, precioUnitario: parseadas[i].precio })),
    ...parseadosServ.map((v) => ({ cantidad: v.cantidad ?? 0, precioUnitario: v.precio ?? 0 })),
  ]);
  const totalNum = totalTexto.trim() === "" ? null : aPrecio(totalTexto);
  const totalMostrado = totalNum ?? suma;
  // Ya cobrada (cerrada o pendiente de stock): se muestra el total, el descuento y lo realmente cobrado.
  const cobrado =
    (solicitud.estado === "cerrada" || solicitud.estado === "pendiente_stock") && solicitud.montoCobrado !== null
      ? solicitud.montoCobrado
      : null;
  const ajuste = cobrado !== null ? Math.round((totalMostrado - cobrado) * 100) / 100 : 0;
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

  function elegirPresentacion(clave: string, varianteId: string) {
    if (!varianteId) return;
    for (const m of materiales) {
      const v = m.variantes.find((x) => x.id === varianteId);
      if (!v) continue;
      setLineas((ls) =>
        ls.map((l) =>
          l.clave === clave
            ? { ...l, tipo: "variante", refId: v.id, nombre: m.nombre, presentacion: etiquetaVariante(v), precio: v.precioVenta.toFixed(2), stock: v.stock }
            : l,
        ),
      );
      return;
    }
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
    const serviciosEnvio: ServicioEdicion[] = servicios.map((v, i) => ({
      ...(v.servicioId ? { servicioId: v.servicioId } : {}),
      descripcion: v.descripcion.trim(),
      unidad: v.unidad.trim() || "unidad",
      cantidad: parseadosServ[i].cantidad as number,
      precioUnitario: parseadosServ[i].precio as number,
    }));
    const s = await ejecutar("guardar", () => guardarItems(solicitud.id, items, totalFinal, serviciosEnvio));
    if (s) onActualizada(s, { texto: "Cambios guardados. Recuerda enviarle el detalle actualizado al cliente." });
  }

  const costoNum = costoTexto.trim() === "" ? null : Number(costoTexto.replace(",", "."));
  const costoCambio = costoNum !== solicitud.costoServicios && !(costoNum === null && solicitud.costoServicios === null);

  async function guardarCosto() {
    if (costoNum !== null && (Number.isNaN(costoNum) || costoNum < 0)) {
      setCostoError("Escribe un monto válido (0 o más).");
      return;
    }
    setCostoError(null);
    const s = await ejecutar("costo", () => registrarCostoServicios(solicitud.id, costoNum));
    if (s) onActualizada(s, { texto: costoNum === null ? "Se quitó el pago a trabajadores." : "Pago a trabajadores registrado." });
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
    : lineas.length + servicios.length === 0
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
            {solicitud.montoServicios !== null && solicitud.montoServicios > 0 && ` (servicios - mano de obra: ${dinero(solicitud.montoServicios)})`}
            {solicitud.metodoPago && ` · ${ETIQUETA_METODO[solicitud.metodoPago] ?? solicitud.metodoPago}`}
            {solicitud.referenciaPago && ` · ref. ${solicitud.referenciaPago}`}. {lineas.length > 0 ? "El inventario ya fue descontado." : "No hubo productos: no se movió inventario."}
          </p>
          {solicitud.descuentoPct !== null && solicitud.descuentoMonto !== null && (
            <p className="mt-1 text-[#4A4538]">
              Incluye descuento por divisas de {solicitud.descuentoPct}% ({dinero(solicitud.descuentoMonto)}).
            </p>
          )}
          {solicitud.tasaBcv !== null && solicitud.montoCobradoBs !== null && (
            <p className="mt-1 font-mono text-xs text-[#8A8272]">
              Tasa BCV {solicitud.tasaBcv.toFixed(2)} · {`Bs. ${new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2 }).format(solicitud.montoCobradoBs)}`}
            </p>
          )}
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

        <div className="relative overflow-x-auto bg-white">
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
                      {l.tipo === "material" && abierta ? (
                        <select
                          aria-label={`Elegir presentación de ${l.nombre}`}
                          value=""
                          onChange={(e) => elegirPresentacion(l.clave, e.target.value)}
                          className="mt-1 max-w-full rounded-sm border border-vino bg-white px-2 py-1 text-xs"
                        >
                          <option value="">Elegir presentación…</option>
                          {(materiales.find((m) => m.id === l.refId)?.variantes ?? []).map((v) => (
                            <option key={v.id} value={v.id}>{`${etiquetaVariante(v)} · ${dinero(v.precioVenta)} · stock ${v.stock}`}</option>
                          ))}
                        </select>
                      ) : (
                        l.presentacion && (
                          <p className={l.tipo === "material" ? "text-xs text-vino" : "text-xs text-[#8A8272]"}>{l.presentacion}</p>
                        )
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

        <h3 id="servicios-pedido" className="mb-2 mt-6 font-semibold">Servicios (mano de obra)</h3>
        {servicios.length === 0 ? (
          <p className="bg-white p-3 text-sm text-[#8A8272]">Sin servicios en este pedido.</p>
        ) : (
          <ul aria-labelledby="servicios-pedido" className="divide-y divide-piedra-oscura bg-white">
            {servicios.map((v, i) => {
              const p = parseadosServ[i];
              const importe = p.cantidad !== null && p.precio !== null ? p.cantidad * p.precio : null;
              const campo =
                "w-full rounded-sm border border-piedra-oscura bg-white px-2 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-dorado";
              const cambiar = (c: Partial<LineaServicio>) => setServicios((ls) => ls.map((x) => (x.clave === v.clave ? { ...x, ...c } : x)));
              return abierta ? (
                <li key={v.clave} className="grid gap-x-3 gap-y-2 p-3 md:grid-cols-[1fr_84px_84px_100px_92px_auto] md:items-end">
                  <div>
                    <label htmlFor={`sd-${v.clave}`} className="mb-1 block text-xs text-[#8A8272]">Descripción</label>
                    <input id={`sd-${v.clave}`} className={campo} value={v.descripcion} maxLength={300} onChange={(e) => cambiar({ descripcion: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor={`su-${v.clave}`} className="mb-1 block text-xs text-[#8A8272]">Unidad</label>
                    <input id={`su-${v.clave}`} className={campo} value={v.unidad} maxLength={30} onChange={(e) => cambiar({ unidad: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor={`sc-${v.clave}`} className="mb-1 block text-xs text-[#8A8272]">Cantidad</label>
                    <input id={`sc-${v.clave}`} className={`${campo} text-right font-mono`} inputMode="decimal" value={v.cantidad} onChange={(e) => cambiar({ cantidad: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor={`sp-${v.clave}`} className="mb-1 block text-xs text-[#8A8272]">Precio (USD)</label>
                    <input id={`sp-${v.clave}`} className={`${campo} text-right font-mono`} inputMode="decimal" value={v.precio} onChange={(e) => cambiar({ precio: e.target.value })} />
                  </div>
                  <p className="text-right font-mono text-sm md:pb-2" aria-label="Importe">{importe !== null ? dinero(importe) : "—"}</p>
                  <button
                    type="button"
                    aria-label={`Quitar ${v.descripcion || "servicio"}`}
                    onClick={() => setServicios((ls) => ls.filter((x) => x.clave !== v.clave))}
                    className="justify-self-end rounded-sm border border-piedra-oscura px-2.5 py-2 text-sm text-vino hover:border-vino"
                  >
                    Quitar
                  </button>
                </li>
              ) : (
                <li key={v.clave} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                  <span>{v.descripcion}</span>
                  <span className="font-mono">{v.cantidad} {v.unidad} × {dinero(Number(v.precio))} = {importe !== null ? dinero(importe) : "—"}</span>
                </li>
              );
            })}
          </ul>
        )}
        {abierta && (
          <div className="mt-3">
            <Button type="button" variante="secundario" onClick={() => setDialogoServicio(true)}>Agregar servicio</Button>
          </div>
        )}
        {servicios.length > 0 && solicitud.estado !== "cancelada" && (
          <section aria-labelledby="pago-trabajadores" className="mt-4 bg-white p-4">
            <h4 id="pago-trabajadores" className="font-medium">Pago a trabajadores</h4>
            <p className="mt-1 text-sm text-[#8A8272]">
              Lo que se paga por la mano de obra de este pedido. No es parte del precio al cliente: sirve para ver el resultado de los servicios en Reportes.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="w-44">
                <Input label="Monto pagado (USD)" name="costo-servicios" inputMode="decimal" value={costoTexto} placeholder="Sin registrar" onChange={(e) => setCostoTexto(e.target.value)} />
              </div>
              <Button type="button" variante="secundario" onClick={guardarCosto} disabled={!costoCambio || ocupado !== null}>
                {ocupado === "costo" ? "Guardando…" : "Guardar pago"}
              </Button>
              {solicitud.costoServicios !== null && solicitud.montoServicios !== null && (
                <p className="font-mono text-sm text-[#4A4538]">
                  Resultado de servicios: {dinero(solicitud.montoServicios - solicitud.costoServicios)}
                </p>
              )}
            </div>
            {costoError && <p role="alert" className="mt-2 text-sm text-vino">{costoError}</p>}
          </section>
        )}

        {genericos.length > 0 && abierta && (
          <p className="mt-3 text-sm text-vino">
            {genericos.map((g) => g.nombre).join(", ")}: el cliente no eligió presentación. Elígela en el selector del ítem.
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
          {cobrado !== null ? (
            <dl className="ml-auto min-w-[16rem] space-y-1 text-right text-sm">
              <div className="flex justify-between gap-6">
                <dt className="text-[#8A8272]">Total{totalNum !== null ? " acordado" : " del pedido"}</dt>
                <dd className="font-mono">{dinero(totalMostrado)}</dd>
              </div>
              {ajuste > 0.005 && (
                <div className="flex justify-between gap-6 text-esmeralda">
                  <dt>
                    {solicitud.descuentoPct !== null
                      ? `Descuento por divisas (${solicitud.descuentoPct}%${solicitud.descuentoIncluyeServicios === false ? ", solo productos" : ""})`
                      : "Ajuste al cobrar"}
                  </dt>
                  <dd className="font-mono">−{dinero(solicitud.descuentoMonto ?? ajuste)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-6 border-t border-piedra-oscura pt-1">
                <dt className="font-medium">Total cobrado</dt>
                <dd><strong className="font-mono text-xl">{dinero(cobrado)}</strong></dd>
              </div>
              {solicitud.montoCobradoBs !== null && (
                <p className="font-mono text-xs text-[#8A8272]">
                  {`Bs. ${new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2 }).format(solicitud.montoCobradoBs)}`}
                </p>
              )}
            </dl>
          ) : (
            <p className="text-right">
              <span className="text-sm text-[#8A8272]">Total{totalNum !== null ? " acordado" : ""}</span>
              <br />
              <strong className="font-mono text-xl">{dinero(totalMostrado)}</strong>
              <PrecioBs usd={totalMostrado} className="block font-mono text-xs text-[#8A8272]" />
              {parcial && totalNum === null && <span className="block text-xs text-vino">hay ítems sin precio</span>}
            </p>
          )}
        </div>
      </section>

      {error && <p role="alert" className="mt-4 text-vino">{error}</p>}

      {solicitud.estado !== "cancelada" && (solicitud.estado !== "cerrada" || solicitud.pagos.length > 0) && (
        <PanelCobro
          solicitud={solicitud}
          bloqueo={motivoNoCerrar}
          onActualizada={(s, texto) => onActualizada(s, texto ? { texto } : undefined)}
        />
      )}

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
          <button onClick={() => setDialogo("cancelar")} className="text-sm text-vino underline">
            Cancelar solicitud
          </button>
        </section>
      )}

      {solicitud.estado === "cerrada" && esAdmin && (
        <section className="mt-6">
          <button onClick={() => setDialogo("cancelar")} className="text-sm text-vino underline">
            Anular venta (repone el inventario)
          </button>
        </section>
      )}

      {dialogoServicio && (
        <DialogoServicio
          onCerrar={() => setDialogoServicio(false)}
          onAgregar={(d: DatosLineaServicio) => {
            setServicios((ls) => [
              ...ls,
              { clave: nuevaClave(), servicioId: d.servicioId, descripcion: d.descripcion, unidad: d.unidad, cantidad: String(d.cantidad), precio: String(d.precioUnitario) },
            ]);
            setDialogoServicio(false);
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

