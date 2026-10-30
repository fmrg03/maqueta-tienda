"use client";

import Link from "next/link";
import { dinero } from "@/lib/panel/carrito";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/Badge";
import { textoAtributos } from "@/lib/panel/materiales";
import {
  fechaMovimiento,
  listarMovimientos,
  type Movimiento,
  type OrigenMov,
  type TipoMov,
} from "@/lib/panel/movimientos";

const PAGINA = 50;

const campo = "rounded-sm border border-piedra-oscura bg-white px-3 py-2 text-sm";

function Opciones<T extends string>({ valor, onCambio, opciones, etiqueta }: { valor: T | ""; onCambio: (v: T | "") => void; opciones: Array<[T | "", string]>; etiqueta: string }) {
  return (
    <div role="group" aria-label={etiqueta} className="flex gap-2">
      {opciones.map(([v, l]) => (
        <button
          key={l}
          type="button"
          aria-pressed={valor === v}
          onClick={() => onCambio(v)}
          className={clsx("rounded-sm border px-3 py-2 text-sm", valor === v ? "border-negro bg-negro text-texto-claro" : "border-piedra-oscura bg-white hover:border-negro")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function ListaMovimientos() {
  const [tipo, setTipo] = useState<TipoMov | "">("");
  const [origen, setOrigen] = useState<OrigenMov | "">("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [texto, setTexto] = useState("");
  const [buscar, setBuscar] = useState("");
  const [limite, setLimite] = useState(PAGINA);
  const [res, setRes] = useState<{ clave: string; datos: Movimiento[]; total: number } | "error" | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setBuscar(texto.trim()), 300);
    return () => clearTimeout(t);
  }, [texto]);

  const clave = JSON.stringify([tipo, origen, desde, hasta, buscar, limite]);
  useEffect(() => {
    let vigente = true;
    listarMovimientos({ tipo: tipo || undefined, origen: origen || undefined, desde, hasta, buscar, limite })
      .then((r) => vigente && setRes({ clave, ...r }))
      .catch(() => vigente && setRes("error"));
    return () => {
      vigente = false;
    };
  }, [clave, tipo, origen, desde, hasta, buscar, limite]);

  // Al cambiar un filtro se vuelve a la primera página.
  const cambiar = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setLimite(PAGINA);
  };

  const datos = res && res !== "error" ? res.datos : null;
  const total = res && res !== "error" ? res.total : 0;
  const cargando = res !== "error" && (res === null || res.clave !== clave);
  const rangoInvalido = desde && hasta && desde > hasta;

  return (
    <div className="max-w-5xl">
      <h1 className="font-serif text-[26px] font-semibold">Movimientos</h1>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <p className="mb-6 text-[#8A8272]">
        Historial de todas las entradas y salidas de inventario. Para registrar una entrada o salida a mano, abre el material y usa &quot;Entrada / salida&quot;.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
          <label htmlFor="mov-buscar" className="text-sm font-medium">Buscar</label>
          <input id="mov-buscar" className={campo} placeholder="Material, SKU o motivo" value={texto} onChange={(e) => cambiar(setTexto)(e.target.value)} />
        </div>
        <Opciones etiqueta="Tipo" valor={tipo} onCambio={cambiar(setTipo)} opciones={[["", "Todos"], ["entrada", "Entradas"], ["salida", "Salidas"]]} />
        <Opciones etiqueta="Origen" valor={origen} onCambio={cambiar(setOrigen)} opciones={[["", "Cualquier origen"], ["venta", "Ventas"], ["manual", "Manuales"]]} />
        <div className="flex flex-col gap-1">
          <label htmlFor="mov-desde" className="text-sm font-medium">Desde</label>
          <input id="mov-desde" type="date" className={campo} value={desde} onChange={(e) => cambiar(setDesde)(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="mov-hasta" className="text-sm font-medium">Hasta</label>
          <input id="mov-hasta" type="date" className={campo} value={hasta} onChange={(e) => cambiar(setHasta)(e.target.value)} />
        </div>
        {(tipo || origen || desde || hasta || texto) && (
          <button type="button" className="pb-2 text-sm underline" onClick={() => { setTipo(""); setOrigen(""); setDesde(""); setHasta(""); setTexto(""); setLimite(PAGINA); }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {rangoInvalido && <p role="alert" className="mb-3 text-sm text-vino">La fecha &quot;Desde&quot; es posterior a &quot;Hasta&quot;.</p>}
      {res === "error" && <p role="alert" className="text-vino">No pudimos cargar los movimientos. Intenta de nuevo.</p>}
      {!datos && res !== "error" && <p className="text-[#8A8272]">Cargando…</p>}
      {datos && datos.length === 0 && !cargando && <p className="bg-white p-6 text-[#8A8272]">No hay movimientos con estos filtros.</p>}

      {datos && datos.length > 0 && (
        <>
          <p className="mb-2 text-sm text-[#8A8272]">Mostrando {datos.length} de {total}</p>
          <div className={clsx("relative overflow-x-auto bg-white transition-opacity", cargando && "opacity-60")}>
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-piedra-oscura text-left text-xs text-[#8A8272]">
                  <th className="px-4 py-3 font-normal">Fecha</th>
                  <th className="px-4 py-3 font-normal">Material</th>
                  <th className="px-4 py-3 text-right font-normal">Cantidad</th>
                  <th className="px-4 py-3 font-normal">Detalle</th>
                  <th className="px-4 py-3 font-normal">Registró</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-piedra-oscura">
                {datos.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">{fechaMovimiento(m.createdAt)}</td>
                    <td className="px-4 py-3">
                      {m.variante?.material ? (
                        <Link href={`/panel/materiales/${m.variante.material.id}`} className="font-medium underline-offset-2 hover:underline">
                          {m.variante.material.nombre}
                        </Link>
                      ) : "—"}
                      <p className="font-mono text-xs text-[#8A8272]">
                        {m.variante?.skuVariante}
                        {m.variante && textoAtributos(m.variante.atributos) && ` · ${textoAtributos(m.variante.atributos)}`}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Badge tono={m.tipo === "entrada" ? "exito" : "alerta"}>
                        {m.tipo === "entrada" ? "+" : "−"}{m.cantidad}
                      </Badge>
                      <span className="sr-only"> {m.tipo}</span>
                    </td>
                    <td className="px-4 py-3">
                      {m.motivo || "—"}
                      {m.tipo === "entrada" && (m.proveedor || m.precioCostoUnitario != null) && (
                        <span className="block text-xs text-[#8A8272]">
                          {[m.proveedor?.nombre, m.precioCostoUnitario != null && `${dinero(Number(m.precioCostoUnitario))} c/u`].filter(Boolean).join(" · ")}
                        </span>
                      )}
                      {m.solicitudId && (
                        <Link href={`/panel/carrito/${m.solicitudId}`} className="ml-2 text-xs underline">Ver venta</Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#8A8272]">{m.usuario?.nombre ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {datos.length < total && (
            <button type="button" disabled={cargando} onClick={() => setLimite((l) => l + PAGINA)} className="mt-4 rounded-sm border border-negro px-5 py-2.5 text-sm font-medium hover:bg-negro hover:text-texto-claro disabled:opacity-50">
              Ver más
            </button>
          )}
        </>
      )}
    </div>
  );
}
