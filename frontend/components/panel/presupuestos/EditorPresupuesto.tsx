"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PrecioBs } from "@/components/ui/PrecioBs";
import { ApiError } from "@/lib/api/client";
import { getUsuarioSesion, suscribirSesion } from "@/lib/auth/auth";
import { dinero, enlaceWhatsAppCliente, fechaCorta } from "@/lib/panel/carrito";
import {
  calcularTotales,
  cambiarEstadoPresupuesto,
  convertirPresupuesto,
  crearPresupuesto,
  descargarPdfPresupuesto,
  eliminarPresupuesto,
  enviarPresupuesto,
  ETIQUETA_ESTADO_PRESUPUESTO,
  guardarPresupuesto,
  importeLinea,
  numeroPresupuesto,
  obtenerPresupuesto,
  TONO_ESTADO_PRESUPUESTO,
  UNIDADES_SUGERIDAS,
  type DatosPresupuesto,
  type LineaPresupuesto,
  type OpcionCatalogo,
  type Presupuesto,
  type TipoLinea,
} from "@/lib/panel/presupuestos";
import { DialogoServicio, type DatosLineaServicio } from "./DialogoServicio";
import { SelectorProducto } from "./SelectorProducto";

// En el formulario, cantidad y precio son texto para poder escribir "12," sin que se pierda el cursor.
interface LineaEd {
  clave: string;
  tipo: TipoLinea;
  varianteId?: string | null;
  comboId?: string | null;
  servicioId?: string | null;
  descripcion: string;
  unidad: string;
  cantidad: string;
  precio: string;
}

let contador = 0;
const nuevaClave = () => `l${(contador += 1)}`;
const num = (t: string) => (t.trim() === "" ? NaN : Number(t.replace(",", ".")));

const desdeLinea = (l: LineaPresupuesto): LineaEd => ({
  clave: nuevaClave(),
  tipo: l.tipo,
  varianteId: l.varianteId,
  comboId: l.comboId,
  servicioId: l.servicioId,
  descripcion: l.descripcion,
  unidad: l.unidad,
  cantidad: String(l.cantidad),
  precio: String(l.precioUnitario),
});

const msg = (e: unknown) => (e instanceof ApiError ? e.message : "No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.");

export function EditorPresupuesto({ id }: { id: string | null }) {
  const router = useRouter();
  const usuario = useSyncExternalStore(suscribirSesion, getUsuarioSesion, () => null);
  const puedeGestionar = usuario?.rol === "admin" || usuario?.rol === "ventas";

  const [guardado, setGuardado] = useState<Presupuesto | null>(null);
  const [fallo, setFallo] = useState(false);
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [obra, setObra] = useState("");
  const [notas, setNotas] = useState("");
  const [validez, setValidez] = useState("15");
  const [descuento, setDescuento] = useState("0");
  const [lineas, setLineas] = useState<LineaEd[]>([]);
  const [sucio, setSucio] = useState(id === null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [selector, setSelector] = useState(false);
  const [dialogoServicio, setDialogoServicio] = useState(false);
  const [confirmar, setConfirmar] = useState<"convertir" | "eliminar" | null>(null);

  function cargar(p: Presupuesto) {
    setGuardado(p);
    setCliente(p.clienteNombre);
    setTelefono(p.clienteTelefono ?? "");
    setCorreo(p.clienteEmail ?? "");
    setObra(p.obra ?? "");
    setNotas(p.notas ?? "");
    setValidez(String(p.validezDias));
    setDescuento(String(p.descuentoPct));
    setLineas(p.items.map(desdeLinea));
    setSucio(false);
  }

  useEffect(() => {
    if (id === null) return;
    let vigente = true;
    obtenerPresupuesto(id)
      .then((p) => vigente && cargar(p))
      .catch(() => vigente && setFallo(true));
    return () => {
      vigente = false;
    };
  }, [id]);

  const bloqueado = guardado?.estado === "convertido";
  const marcar = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setSucio(true);
  };

  const lineasNum: LineaPresupuesto[] = useMemo(
    () =>
      lineas.map((l) => ({
        tipo: l.tipo,
        descripcion: l.descripcion,
        unidad: l.unidad,
        cantidad: Number.isNaN(num(l.cantidad)) ? 0 : num(l.cantidad),
        precioUnitario: Number.isNaN(num(l.precio)) ? 0 : num(l.precio),
      })),
    [lineas],
  );
  const totales = calcularTotales(lineasNum, Number.isNaN(num(descuento)) ? 0 : num(descuento));

  function cambiarLinea(clave: string, cambios: Partial<LineaEd>) {
    setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)));
    setSucio(true);
  }

  function agregarProducto(o: OpcionCatalogo) {
    setLineas((ls) => {
      // Si ya está, suma una unidad en vez de duplicar la línea.
      const existente = ls.find((l) => (o.varianteId && l.varianteId === o.varianteId) || (o.comboId && l.comboId === o.comboId));
      if (existente) return ls.map((l) => (l === existente ? { ...l, cantidad: String((num(l.cantidad) || 0) + 1) } : l));
      return [
        ...ls,
        { clave: nuevaClave(), tipo: o.tipo, varianteId: o.varianteId, comboId: o.comboId, descripcion: o.descripcion, unidad: "unidad", cantidad: "1", precio: String(o.precio) },
      ];
    });
    setSucio(true);
  }

  function agregarServicio(d: DatosLineaServicio) {
    setLineas((ls) => [
      ...ls,
      { clave: nuevaClave(), tipo: "servicio", servicioId: d.servicioId, descripcion: d.descripcion, unidad: d.unidad, cantidad: String(d.cantidad), precio: String(d.precioUnitario) },
    ]);
    setSucio(true);
    setDialogoServicio(false);
  }

  /** Devuelve los datos listos para enviar o un texto con lo que falta. */
  function armarDatos(): DatosPresupuesto | string {
    if (cliente.trim().length < 2) return "Escribe el nombre del cliente.";
    const v = num(validez);
    if (!Number.isInteger(v) || v < 1 || v > 365) return "La validez debe ser un número de días entre 1 y 365.";
    const d = num(descuento);
    if (Number.isNaN(d) || d < 0 || d > 100) return "El descuento debe estar entre 0 y 100.";
    const items: LineaPresupuesto[] = [];
    for (const l of lineas) {
      const c = num(l.cantidad);
      const p = num(l.precio);
      const nombre = l.descripcion.trim() || "una línea";
      if (l.descripcion.trim() === "") return "Todas las líneas necesitan descripción.";
      if (!(c > 0)) return `La cantidad de "${nombre}" debe ser mayor que 0.`;
      if (l.tipo !== "servicio" && !Number.isInteger(c)) return `La cantidad de "${nombre}" debe ser un número entero.`;
      if (Number.isNaN(p) || p < 0) return `Revisa el precio de "${nombre}".`;
      items.push({ tipo: l.tipo, varianteId: l.varianteId, comboId: l.comboId, servicioId: l.servicioId, descripcion: l.descripcion.trim(), unidad: l.unidad.trim() || "unidad", cantidad: c, precioUnitario: p });
    }
    return { clienteNombre: cliente.trim(), clienteTelefono: telefono, clienteEmail: correo, obra, notas, validezDias: v, descuentoPct: d, items };
  }

  async function ejecutar<T>(nombre: string, fn: () => Promise<T>): Promise<T | undefined> {
    setOcupado(nombre);
    setError(null);
    setAviso(null);
    try {
      return await fn();
    } catch (e) {
      console.error(e);
      setError(msg(e));
      return undefined;
    } finally {
      setOcupado(null);
    }
  }

  /** Guarda lo pendiente. Devuelve el presupuesto al día, o undefined si falló. */
  async function guardarPendiente(): Promise<Presupuesto | undefined> {
    if (guardado && !sucio) return guardado;
    const datos = armarDatos();
    if (typeof datos === "string") {
      setError(datos);
      return undefined;
    }
    const p = guardado ? await guardarPresupuesto(guardado.id, datos) : await crearPresupuesto(datos);
    cargar(p);
    return p;
  }

  async function guardar() {
    const nuevo = guardado === null;
    const p = await ejecutar("guardar", guardarPendiente);
    if (!p) return;
    if (nuevo) router.replace(`/panel/presupuestos/${p.id}`);
    else setAviso("Presupuesto guardado.");
  }

  async function descargarPdf() {
    await ejecutar("pdf", async () => {
      const p = await guardarPendiente();
      if (!p) return;
      await descargarPdfPresupuesto(p.id, p.numero);
      if (id === null) router.replace(`/panel/presupuestos/${p.id}`);
    });
  }

  async function imprimir() {
    const ventana = window.open("", "_blank");
    const p = await ejecutar("imprimir", guardarPendiente);
    if (!p) return ventana?.close();
    if (ventana) ventana.location.href = `/panel/presupuestos/${p.id}/imprimir`;
    if (id === null) router.replace(`/panel/presupuestos/${p.id}`);
  }

  async function enviarWhatsApp() {
    // La ventana se abre en el clic (antes de los await) para que el navegador no la bloquee.
    const ventana = window.open("", "_blank");
    const r = await ejecutar("enviar", async () => {
      const p = await guardarPendiente();
      if (!p) return undefined;
      const e = await enviarPresupuesto(p.id);
      cargar(await obtenerPresupuesto(p.id));
      return { ...e, id: p.id };
    });
    if (!r) return ventana?.close();
    const enlace = r.telefono ? enlaceWhatsAppCliente(r.telefono, r.mensaje) : `https://wa.me/?text=${encodeURIComponent(r.mensaje)}`;
    if (ventana) ventana.location.href = enlace;
    setAviso(ventana ? "Se abrió WhatsApp con el mensaje y el enlace al PDF: envíalo desde ahí." : "El navegador bloqueó la ventana de WhatsApp.");
    if (id === null) router.replace(`/panel/presupuestos/${r.id}`);
  }

  async function cambiarEstado(estado: "borrador" | "aprobado" | "rechazado") {
    if (!guardado) return;
    await ejecutar("estado", async () => {
      if (sucio) {
        const p = await guardarPendiente();
        if (!p) return;
      }
      cargar(await cambiarEstadoPresupuesto(guardado.id, estado));
      setAviso(`Presupuesto marcado como ${ETIQUETA_ESTADO_PRESUPUESTO[estado].toLowerCase()}.`);
    });
  }

  async function convertir() {
    if (!guardado) return;
    setConfirmar(null);
    const r = await ejecutar("convertir", async () => {
      const p = await guardarPendiente();
      if (!p) return undefined;
      return convertirPresupuesto(p.id);
    });
    if (r) router.push(`/panel/carrito/${r.solicitudId}`);
  }

  async function eliminar() {
    if (!guardado) return;
    setConfirmar(null);
    const ok = await ejecutar("eliminar", async () => {
      await eliminarPresupuesto(guardado.id);
      return true;
    });
    if (ok) router.push("/panel/presupuestos");
  }

  if (fallo) {
    return (
      <div role="alert" className="max-w-xl">
        <p className="text-vino">No encontramos este presupuesto o no pudimos cargarlo.</p>
        <Link href="/panel/presupuestos" className="mt-3 inline-block underline">Volver a presupuestos</Link>
      </div>
    );
  }
  if (id !== null && !guardado) return <p className="text-[#8A8272]">Cargando…</p>;

  const productos = lineas.filter((l) => l.tipo !== "servicio");
  const servicios = lineas.filter((l) => l.tipo === "servicio");
  const estado = guardado?.estado;

  const filas = (grupo: LineaEd[], vacio: string) =>
    grupo.length === 0 ? (
      <p className="p-4 text-sm text-[#8A8272]">{vacio}</p>
    ) : (
      <ul className="divide-y divide-piedra-oscura">
        {grupo.map((l) => {
          const entero = l.tipo !== "servicio";
          const importe = importeLinea({ cantidad: Number.isNaN(num(l.cantidad)) ? 0 : num(l.cantidad), precioUnitario: Number.isNaN(num(l.precio)) ? 0 : num(l.precio) });
          const campo = "w-full rounded-sm border border-piedra-oscura bg-white px-2 py-2 text-sm disabled:bg-piedra disabled:text-[#8A8272] focus-visible:outline focus-visible:outline-2 focus-visible:outline-dorado";
          return (
            <li key={l.clave} className="grid gap-x-3 gap-y-2 p-3 md:grid-cols-[1fr_84px_84px_100px_92px_auto] md:items-end">
              <div>
                <label className="mb-1 block text-xs text-[#8A8272]" htmlFor={`d-${l.clave}`}>Descripción {l.tipo === "combo" && "(combo)"}</label>
                <input id={`d-${l.clave}`} className={campo} value={l.descripcion} maxLength={300} disabled={bloqueado} onChange={(e) => cambiarLinea(l.clave, { descripcion: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#8A8272]" htmlFor={`u-${l.clave}`}>Unidad</label>
                <input id={`u-${l.clave}`} className={campo} list="unidades-sugeridas" value={l.unidad} maxLength={30} disabled={bloqueado} onChange={(e) => cambiarLinea(l.clave, { unidad: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#8A8272]" htmlFor={`c-${l.clave}`}>Cantidad</label>
                <input id={`c-${l.clave}`} className={`${campo} text-right font-mono`} inputMode={entero ? "numeric" : "decimal"} value={l.cantidad} disabled={bloqueado} onChange={(e) => cambiarLinea(l.clave, { cantidad: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#8A8272]" htmlFor={`p-${l.clave}`}>Precio (USD)</label>
                <input id={`p-${l.clave}`} className={`${campo} text-right font-mono`} inputMode="decimal" value={l.precio} disabled={bloqueado} onChange={(e) => cambiarLinea(l.clave, { precio: e.target.value })} />
              </div>
              <p className="text-right font-mono text-sm md:pb-2" aria-label="Importe">{dinero(importe)}</p>
              {!bloqueado && (
                <button
                  type="button"
                  onClick={() => {
                    setLineas((ls) => ls.filter((x) => x.clave !== l.clave));
                    setSucio(true);
                  }}
                  aria-label={`Quitar ${l.descripcion || "línea"}`}
                  className="justify-self-end rounded-sm border border-piedra-oscura px-2.5 py-2 text-sm text-vino hover:border-vino md:mb-0"
                >
                  Quitar
                </button>
              )}
            </li>
          );
        })}
      </ul>
    );

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-[26px] font-semibold">{guardado ? `Presupuesto N° ${numeroPresupuesto(guardado.numero)}` : "Nuevo presupuesto"}</h1>
          {guardado && (
            <p className="mt-1 text-sm text-[#8A8272]">
              Creado {fechaCorta(guardado.createdAt)}
              {guardado.creadoPorNombre ? ` por ${guardado.creadoPorNombre}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {estado && <Badge tono={TONO_ESTADO_PRESUPUESTO[estado]}>{ETIQUETA_ESTADO_PRESUPUESTO[estado]}</Badge>}
          <Link href="/panel/presupuestos" className="text-sm underline hover:text-dorado-oscuro">Volver a la lista</Link>
        </div>
      </div>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />

      {bloqueado && guardado?.solicitudId && (
        <p role="status" className="mb-4 border-l-4 border-esmeralda bg-white px-3 py-2 text-sm">
          Este presupuesto ya se convirtió en una solicitud de carrito y no se puede modificar.{" "}
          {puedeGestionar && <Link href={`/panel/carrito/${guardado.solicitudId}`} className="underline">Ver la solicitud</Link>}
        </p>
      )}
      {error && <p role="alert" className="mb-4 text-vino">{error}</p>}
      {aviso && <p role="status" className="mb-4 border-l-4 border-esmeralda bg-white px-3 py-2 text-sm">{aviso}</p>}

      <section aria-labelledby="sec-cliente" className="mb-6 bg-white p-5">
        <h2 id="sec-cliente" className="mb-3 font-semibold">Cliente y obra</h2>
        <fieldset disabled={bloqueado} className="grid gap-4 sm:grid-cols-2">
          <Input label="Nombre del cliente" name="cliente" value={cliente} maxLength={150} onChange={(e) => marcar(setCliente)(e.target.value)} />
          <Input label="Teléfono (para WhatsApp)" name="telefono" inputMode="tel" value={telefono} maxLength={30} placeholder="0414 1234567" onChange={(e) => marcar(setTelefono)(e.target.value)} />
          <Input label="Correo (opcional)" name="correo" type="email" value={correo} maxLength={150} onChange={(e) => marcar(setCorreo)(e.target.value)} />
          <Input label="Obra o ubicación (opcional)" name="obra" value={obra} maxLength={200} placeholder="Baño principal, Av. Lara…" onChange={(e) => marcar(setObra)(e.target.value)} />
          <Input label="Validez (días)" name="validez" inputMode="numeric" value={validez} onChange={(e) => marcar(setValidez)(e.target.value)} />
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="notas" className="text-sm font-medium">Notas para el cliente (salen en el PDF)</label>
            <textarea id="notas" rows={3} maxLength={2000} value={notas} onChange={(e) => marcar(setNotas)(e.target.value)} className="rounded-sm border border-piedra-oscura bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-dorado disabled:bg-piedra" />
          </div>
        </fieldset>
      </section>

      <datalist id="unidades-sugeridas">
        {UNIDADES_SUGERIDAS.map((u) => <option key={u} value={u} />)}
      </datalist>

      <section aria-labelledby="sec-productos" className="mb-6 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
          <h2 id="sec-productos" className="font-semibold">Materiales y productos</h2>
          {!bloqueado && <Button type="button" variante="secundario" onClick={() => setSelector(true)}>Agregar del catálogo</Button>}
        </div>
        {filas(productos, "Aún no hay productos. Agrégalos desde el catálogo.")}
      </section>

      <section aria-labelledby="sec-servicios" className="mb-6 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
          <h2 id="sec-servicios" className="font-semibold">Servicios</h2>
          {!bloqueado && <Button type="button" variante="secundario" onClick={() => setDialogoServicio(true)}>Agregar servicio</Button>}
        </div>
        {filas(servicios, "Demolición, pegado de cerámica, montaje de porcelanato… agrégalos con su precio por unidad.")}
      </section>

      <section aria-labelledby="sec-totales" className="mb-6 bg-white p-5">
        <h2 id="sec-totales" className="mb-3 font-semibold">Totales</h2>
        <dl className="ml-auto max-w-sm space-y-1.5 font-mono text-sm">
          {totales.subtotalProductos > 0 && totales.subtotalServicios > 0 && (
            <>
              <div className="flex justify-between"><dt>Materiales</dt><dd>{dinero(totales.subtotalProductos)}</dd></div>
              <div className="flex justify-between"><dt>Servicios</dt><dd>{dinero(totales.subtotalServicios)}</dd></div>
            </>
          )}
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{dinero(totales.subtotal)}</dd></div>
          <div className="flex items-center justify-between gap-3">
            <dt><label htmlFor="descuento">Descuento (%)</label></dt>
            <dd className="flex items-center gap-2">
              <input id="descuento" inputMode="decimal" disabled={bloqueado} value={descuento} onChange={(e) => marcar(setDescuento)(e.target.value)} className="w-20 rounded-sm border border-piedra-oscura bg-white px-2 py-1.5 text-right disabled:bg-piedra" />
              <span className="w-24 text-right text-esmeralda">{totales.descuentoMonto > 0 ? `−${dinero(totales.descuentoMonto)}` : ""}</span>
            </dd>
          </div>
          <div className="flex justify-between border-t border-piedra-oscura pt-2 text-base font-semibold"><dt>Total</dt><dd>{dinero(totales.total)}</dd></div>
          <p className="text-right text-xs text-[#8A8272]"><PrecioBs usd={totales.total} /></p>
        </dl>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        {!bloqueado && (
          <Button type="button" onClick={guardar} disabled={ocupado !== null || (guardado !== null && !sucio)}>
            {ocupado === "guardar" ? "Guardando…" : sucio || !guardado ? "Guardar" : "Guardado"}
          </Button>
        )}
        <Button type="button" variante="secundario" onClick={descargarPdf} disabled={ocupado !== null || lineas.length === 0}>
          {ocupado === "pdf" ? "Generando…" : "Descargar PDF"}
        </Button>
        <Button type="button" variante="secundario" onClick={imprimir} disabled={ocupado !== null || lineas.length === 0}>Imprimir</Button>
        {!bloqueado && (
          <Button type="button" variante="secundario" onClick={enviarWhatsApp} disabled={ocupado !== null || lineas.length === 0}>
            {ocupado === "enviar" ? "Preparando…" : "Enviar por WhatsApp"}
          </Button>
        )}
      </div>

      {guardado && !bloqueado && (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-piedra-oscura pt-5">
          <span className="text-sm text-[#4A4538]">Estado:</span>
          {estado !== "aprobado" && <Button type="button" variante="secundario" disabled={ocupado !== null} onClick={() => cambiarEstado("aprobado")}>Marcar aprobado</Button>}
          {estado !== "rechazado" && <Button type="button" variante="secundario" disabled={ocupado !== null} onClick={() => cambiarEstado("rechazado")}>Marcar rechazado</Button>}
          {estado !== "borrador" && <Button type="button" variante="secundario" disabled={ocupado !== null} onClick={() => cambiarEstado("borrador")}>Volver a borrador</Button>}
          {puedeGestionar && estado === "aprobado" && (
            <Button type="button" disabled={ocupado !== null} onClick={() => setConfirmar("convertir")}>Convertir en solicitud</Button>
          )}
          {puedeGestionar && <button type="button" disabled={ocupado !== null} onClick={() => setConfirmar("eliminar")} className="ml-auto text-sm text-vino underline">Eliminar presupuesto</button>}
        </div>
      )}

      {confirmar === "convertir" && (
        <div role="alertdialog" aria-label="Confirmar conversión" className="mt-4 border-l-4 border-dorado-oscuro bg-white p-4 text-sm">
          <p>Se creará una solicitud de carrito con los productos y combos (a los precios de este presupuesto). Los servicios se quedan solo aquí y el presupuesto ya no se podrá modificar.</p>
          <div className="mt-3 flex gap-3">
            <Button type="button" onClick={convertir}>Sí, convertir</Button>
            <Button type="button" variante="secundario" onClick={() => setConfirmar(null)}>Cancelar</Button>
          </div>
        </div>
      )}
      {confirmar === "eliminar" && (
        <div role="alertdialog" aria-label="Confirmar eliminación" className="mt-4 border-l-4 border-vino bg-white p-4 text-sm">
          <p>¿Eliminar este presupuesto? No se puede deshacer.</p>
          <div className="mt-3 flex gap-3">
            <Button type="button" onClick={eliminar}>Sí, eliminar</Button>
            <Button type="button" variante="secundario" onClick={() => setConfirmar(null)}>Cancelar</Button>
          </div>
        </div>
      )}

      {selector && <SelectorProducto onElegir={agregarProducto} onCerrar={() => setSelector(false)} />}
      {dialogoServicio && <DialogoServicio onAgregar={agregarServicio} onCerrar={() => setDialogoServicio(false)} />}
    </div>
  );
}
