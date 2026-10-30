"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { ApiError } from "@/lib/api/client";
import { dinero } from "@/lib/panel/carrito";
import { textoAtributos } from "@/lib/panel/materiales";
import {
  actualizarProducto,
  actualizarProveedor,
  agregarProducto,
  listarProductosProveedor,
  obtenerProveedor,
  quitarProducto,
  type ProductoProveedor,
  type ProveedorAdmin,
} from "@/lib/panel/proveedores";
import { SelectorPresentacion } from "../combos/SelectorPresentacion";
import { FormularioProveedor } from "./FormularioProveedor";

export function DetalleProveedor({ id, recienCreado }: { id: string; recienCreado: boolean }) {
  const [prov, setProv] = useState<ProveedorAdmin | null>(null);
  const [productos, setProductos] = useState<ProductoProveedor[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [elegida, setElegida] = useState<{ id: string; etiqueta: string } | null>(null);
  const [costo, setCosto] = useState("");
  const [dias, setDias] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [eCosto, setECosto] = useState("");
  const [eDias, setEDias] = useState("");

  const recargarProductos = useCallback(() => {
    listarProductosProveedor(id).then(setProductos).catch(() => setError("No pudimos cargar los productos."));
  }, [id]);

  useEffect(() => {
    let vigente = true;
    obtenerProveedor(id)
      .then((p) => vigente && setProv(p))
      .catch(() => vigente && setFallo(true));
    listarProductosProveedor(id)
      .then((l) => vigente && setProductos(l))
      .catch(() => vigente && setFallo(true));
    return () => {
      vigente = false;
    };
  }, [id]);

  const msg = (e: unknown) => (e instanceof ApiError ? e.message : "No pudimos completar la acción. Inténtalo de nuevo.");

  async function alternarActivo() {
    if (!prov) return;
    setError(null);
    try {
      setProv({ ...prov, ...(await actualizarProveedor(prov.id, { activo: !prov.activo })) });
    } catch (e) {
      setError(msg(e));
    }
  }

  async function agregar() {
    if (!elegida) return;
    const c = Number(costo);
    const d = Number(dias);
    if (!(c >= 0) || costo === "" || !Number.isInteger(d) || d < 0 || dias === "") return setError("Indica el costo y los días de entrega (número entero).");
    setError(null);
    try {
      await agregarProducto(id, { varianteId: elegida.id, precioCostoProveedor: c, tiempoEntregaDias: d });
      setElegida(null);
      setCosto("");
      setDias("");
      setAgregando(false);
      recargarProductos();
    } catch (e) {
      setError(msg(e));
    }
  }

  async function guardarEdicion(pid: string) {
    const c = Number(eCosto);
    const d = Number(eDias);
    if (!(c >= 0) || eCosto === "" || !Number.isInteger(d) || d < 0 || eDias === "") return setError("Costo y días de entrega no válidos.");
    setError(null);
    try {
      await actualizarProducto(pid, { precioCostoProveedor: c, tiempoEntregaDias: d });
      setEditando(null);
      recargarProductos();
    } catch (e) {
      setError(msg(e));
    }
  }

  async function quitar(pid: string) {
    setError(null);
    try {
      await quitarProducto(pid);
      recargarProductos();
    } catch (e) {
      setError(msg(e));
    }
  }

  if (fallo) return <p role="alert" className="text-vino">No pudimos cargar el proveedor.</p>;
  if (!prov || !productos) return <p className="text-[#8A8272]">Cargando…</p>;

  const campo = "w-24 rounded-sm border border-piedra-oscura px-2 py-1 text-sm";

  return (
    <div className="max-w-4xl">
      <Link href="/panel/proveedores" className="text-sm underline">← Proveedores</Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-[26px] font-semibold">
          {prov.nombre} {!prov.activo && <Badge>inactivo</Badge>}
        </h1>
        <button type="button" onClick={alternarActivo} className="rounded-sm border border-negro px-4 py-2 text-sm hover:bg-negro hover:text-texto-claro">
          {prov.activo ? "Desactivar proveedor" : "Reactivar proveedor"}
        </button>
      </div>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      {recienCreado && <p role="status" className="mb-4 text-esmeralda">Proveedor creado. Ahora puedes indicar qué productos te suministra.</p>}
      {error && <p role="alert" className="mb-4 text-vino">{error}</p>}

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold">Datos</h2>
        <FormularioProveedor inicial={prov} onGuardado={(p) => setProv({ ...prov, ...p })} />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold">Productos que suministra</h2>
          {!agregando && (
            <button type="button" onClick={() => setAgregando(true)} className="rounded-sm border border-negro px-4 py-2 text-sm hover:bg-negro hover:text-texto-claro">
              Agregar producto
            </button>
          )}
        </div>

        {agregando && (
          <div className="mb-4 space-y-3">
            {!elegida ? (
              <>
                <SelectorPresentacion
                  yaElegidas={new Set(productos.map((p) => p.variante.id))}
                  onElegir={(v) => setElegida({ id: v.id, etiqueta: `${v.material.nombre} — ${textoAtributos(v.atributos)}` })}
                />
                <button type="button" className="text-sm underline" onClick={() => setAgregando(false)}>Cancelar</button>
              </>
            ) : (
              <div className="flex flex-wrap items-end gap-3 border border-piedra-oscura bg-white p-3">
                <p className="w-full text-sm font-medium">{elegida.etiqueta}</p>
                <label className="text-sm">Costo del proveedor (USD)
                  <input aria-label="Costo del proveedor" type="number" min="0" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} className={`${campo} mt-1 block`} />
                </label>
                <label className="text-sm">Días de entrega
                  <input aria-label="Días de entrega" type="number" min="0" step="1" value={dias} onChange={(e) => setDias(e.target.value)} className={`${campo} mt-1 block`} />
                </label>
                <button type="button" onClick={agregar} className="rounded-sm bg-negro px-4 py-2 text-sm text-texto-claro">Guardar</button>
                <button type="button" onClick={() => setElegida(null)} className="text-sm underline">Elegir otro</button>
              </div>
            )}
          </div>
        )}

        {productos.length === 0 ? (
          <p className="bg-white p-6 text-[#8A8272]">Todavía no hay productos asociados a este proveedor.</p>
        ) : (
          <ul className="divide-y divide-piedra-oscura bg-white">
            {productos.map((p) => {
              const dif = p.precioCostoProveedor - p.variante.precioCosto;
              return (
                <li key={p.id} className="grid items-center gap-x-4 gap-y-2 p-4 md:grid-cols-[1fr_auto_auto]">
                  <div>
                    <p className="font-semibold">{p.variante.material?.nombre} <span className="font-normal text-[#8A8272]">· {textoAtributos(p.variante.atributos)}</span></p>
                    <p className="text-xs text-[#8A8272]">{p.variante.skuVariante} · Costo actual en inventario: {dinero(p.variante.precioCosto)}</p>
                  </div>
                  {editando === p.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input aria-label="Nuevo costo" type="number" min="0" step="0.01" value={eCosto} onChange={(e) => setECosto(e.target.value)} className={campo} />
                      <input aria-label="Nuevos días de entrega" type="number" min="0" step="1" value={eDias} onChange={(e) => setEDias(e.target.value)} className={campo} />
                      <button type="button" onClick={() => guardarEdicion(p.id)} className="rounded-sm bg-negro px-3 py-1.5 text-sm text-texto-claro">Guardar</button>
                      <button type="button" onClick={() => setEditando(null)} className="text-sm underline">Cancelar</button>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm md:text-right">
                        <p>{dinero(p.precioCostoProveedor)} · {p.tiempoEntregaDias} {p.tiempoEntregaDias === 1 ? "día" : "días"}</p>
                        {dif !== 0 && <p className={dif < 0 ? "text-esmeralda" : "text-vino"}>{dif < 0 ? "Más barato" : "Más caro"} que el costo actual ({dinero(Math.abs(dif))})</p>}
                      </div>
                      <div className="flex gap-3 text-sm md:justify-end">
                        <button type="button" className="underline" onClick={() => { setEditando(p.id); setECosto(String(p.precioCostoProveedor)); setEDias(String(p.tiempoEntregaDias)); }}>Editar</button>
                        <button type="button" className="text-vino underline" onClick={() => quitar(p.id)}>Quitar</button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
