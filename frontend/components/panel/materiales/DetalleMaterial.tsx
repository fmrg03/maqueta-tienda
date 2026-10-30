"use client";

import { ImagenMaterial } from "@/components/catalogo/ImagenMaterial";
import { urlImagen } from "@/lib/imagenes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PrecioBs } from "@/components/ui/PrecioBs";
import { ApiError } from "@/lib/api/client";
import { dinero } from "@/lib/panel/carrito";
import {
  actualizarMaterial,
  actualizarVariante,
  crearVariante,
  margenPct,
  obtenerMaterialAdmin,
  textoAtributos,
  UMBRAL_STOCK_BAJO,
  type MaterialAdmin,
  type VarianteAdmin,
} from "@/lib/panel/materiales";
import { DialogoMovimiento } from "./DialogoMovimiento";
import { FormularioMaterial } from "./FormularioMaterial";
import { FormularioVariante } from "./FormularioVariante";
import { Pasos } from "./Pasos";

export function DetalleMaterial({ id, recienCreado }: { id: string; recienCreado: boolean }) {
  const router = useRouter();
  const [material, setMaterial] = useState<MaterialAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editandoDatos, setEditandoDatos] = useState(false);
  const [agregando, setAgregando] = useState<boolean | null>(null); // null = automático
  const [editandoVariante, setEditandoVariante] = useState<string | null>(null);
  const [movimiento, setMovimiento] = useState<{ variante: VarianteAdmin; tipo: "entrada" | "salida" } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setMaterial(await obtenerMaterialAdmin(id));
  }, [id]);

  useEffect(() => {
    let vigente = true;
    obtenerMaterialAdmin(id)
      .then((m) => vigente && setMaterial(m))
      .catch((e) => vigente && setError(e instanceof ApiError && e.statusCode === 404 ? "No encontramos este material." : "No pudimos cargarlo. Intenta de nuevo."));
    return () => {
      vigente = false;
    };
  }, [id]);

  if (error)
    return (
      <div className="max-w-md">
        <p role="alert" className="text-vino">{error}</p>
        <Link href="/panel/materiales" className="mt-3 inline-block underline">Volver a materiales</Link>
      </div>
    );
  if (!material) return <p className="text-[#8A8272]">Cargando…</p>;

  const mostrandoForm = agregando ?? (recienCreado || material.variantes.length === 0);
  const hayVariantes = material.variantes.length > 0;

  return (
    <div className="max-w-5xl">
      <Link href="/panel/materiales" className="text-sm underline">← Materiales</Link>

      {recienCreado && (
        <div className="mt-4">
          <Pasos actual={2} />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-[26px] font-semibold">{material.nombre}</h1>
          <p className="mt-1 font-mono text-xs text-[#8A8272]">
            {material.sku}
            {material.categoria && ` · ${material.categoria.nombre}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!material.activo && <Badge>inactivo</Badge>}
          {material.activo && hayVariantes && (
            <Link href={`/catalogo/${material.id}`} target="_blank" className="text-sm underline">Ver en el catálogo ↗</Link>
          )}
        </div>
      </div>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />

      {aviso && <p role="status" className="mb-4 border-l-4 border-esmeralda bg-white px-3 py-2 text-sm">{aviso}</p>}

      {recienCreado && !hayVariantes && (
        <p className="mb-4 text-[#4A4538]">
          El material quedó guardado. Ahora agrega al menos una presentación: sin ella no se puede vender ni verás precio en el catálogo.
        </p>
      )}

      {/* --- Datos del material --- */}
      <section aria-labelledby="datos" className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="datos" className="font-serif text-lg font-semibold">Datos</h2>
          {!editandoDatos && (
            <button onClick={() => setEditandoDatos(true)} className="text-sm underline">Editar</button>
          )}
        </div>
        {editandoDatos ? (
          <FormularioMaterial
            inicial={material}
            textoBoton="Guardar cambios"
            onGuardar={async (datos) => {
              await actualizarMaterial(material.id, datos);
              await recargar();
              setEditandoDatos(false);
              setAviso("Datos actualizados.");
            }}
            onCancelar={() => setEditandoDatos(false)}
          />
        ) : (
          <dl className="grid gap-x-8 gap-y-1 bg-white p-4 text-sm sm:grid-cols-2">
            <div><dt className="inline text-[#8A8272]">Descripción: </dt><dd className="inline">{material.descripcion || "—"}</dd></div>
            <div className="flex items-center gap-3"><dt className="text-[#8A8272]">Foto: </dt><dd>{urlImagen(material.imagenUrl) ? <ImagenMaterial nombre={material.nombre} imagenUrl={material.imagenUrl} className="!aspect-square !w-16" /> : "—"}</dd></div>
            <div><dt className="inline text-[#8A8272]">Visible en el catálogo: </dt><dd className="inline">{material.activo ? "Sí" : "No"}</dd></div>
          </dl>
        )}
      </section>

      {/* --- Presentaciones --- */}
      <section aria-labelledby="pres">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 id="pres" className="font-serif text-lg font-semibold">Presentaciones</h2>
          {!mostrandoForm && (
            <button onClick={() => setAgregando(true)} className="text-sm underline">＋ Agregar presentación</button>
          )}
        </div>

        {hayVariantes && (
          <div className="relative overflow-x-auto bg-white">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-piedra-oscura text-left font-mono text-xs text-[#8A8272]">
                  <th className="p-3 font-normal">Presentación</th>
                  <th className="p-3 text-right font-normal">Stock</th>
                  <th className="p-3 text-right font-normal">Venta</th>
                  <th className="p-3 text-right font-normal">Costo</th>
                  <th className="p-3 text-right font-normal">Margen</th>
                  <th className="p-3"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {material.variantes.map((v) => {
                  const m = margenPct(v.precioVenta, v.precioCosto);
                  const bajo = v.stock <= UMBRAL_STOCK_BAJO;
                  return (
                    <tr key={v.id} className="border-b border-piedra-oscura align-top last:border-0">
                      <td className="p-3">
                        <p className="font-medium">{textoAtributos(v.atributos) || v.skuVariante}</p>
                        <p className="font-mono text-xs text-[#8A8272]">{v.skuVariante}</p>
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-mono">{v.stock}</span>
                        {bajo && <span className="ml-2 align-middle"><Badge tono="alerta">{v.stock === 0 ? "agotado" : "bajo"}</Badge></span>}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {dinero(v.precioVenta)}
                        <PrecioBs usd={v.precioVenta} className="block text-xs text-[#8A8272]" />
                      </td>
                      <td className="p-3 text-right font-mono">{dinero(v.precioCosto)}</td>
                      <td className={`p-3 text-right font-mono ${m !== null && m < 0 ? "text-vino" : ""}`}>{m === null ? "—" : `${m}%`}</td>
                      <td className="p-3 text-right">
                        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
                          <button onClick={() => setMovimiento({ variante: v, tipo: "entrada" })} className="underline" aria-label={`Registrar movimiento de ${v.skuVariante}`}>
                            Entrada / salida
                          </button>
                          <button onClick={() => setEditandoVariante(v.id)} className="underline" aria-label={`Editar ${v.skuVariante}`}>Editar</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {editandoVariante && (
          <div className="mt-4">
            <FormularioVariante
              key={editandoVariante}
              skuMaterial={material.sku}
              inicial={material.variantes.find((v) => v.id === editandoVariante)}
              onGuardar={async (datos) => {
                await actualizarVariante(editandoVariante, datos);
                await recargar();
                setEditandoVariante(null);
                setAviso("Presentación actualizada.");
              }}
              onCancelar={() => setEditandoVariante(null)}
            />
          </div>
        )}

        {mostrandoForm && !editandoVariante && (
          <div className="mt-4">
            <FormularioVariante
              key={`nueva-${material.variantes.length}`}
              skuMaterial={material.sku}
              onGuardar={async (datos, stock) => {
                await crearVariante(material.id, { ...datos, stock });
                await recargar();
                setAgregando(recienCreado ? true : false);
                setAviso("Presentación agregada. Ya aparece en el catálogo.");
              }}
              onCancelar={() => setAgregando(false)}
            />
          </div>
        )}

        {recienCreado && hayVariantes && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button onClick={() => router.push("/panel/materiales")}>Terminar</Button>
            <span className="text-sm text-[#8A8272]">Puedes seguir agregando presentaciones con el formulario de arriba.</span>
          </div>
        )}
      </section>

      {movimiento && (
        <DialogoMovimiento
          materialId={material.id}
          nombreMaterial={material.nombre}
          variante={movimiento.variante}
          tipoInicial={movimiento.tipo}
          onCerrar={() => setMovimiento(null)}
          onRegistrado={async () => {
            setMovimiento(null);
            await recargar();
            setAviso("Movimiento registrado.");
          }}
        />
      )}
    </div>
  );
}
