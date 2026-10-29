"use client";

import Link from "next/link";
import { useState } from "react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { agregarItem } from "@/lib/carrito/carrito-store";
import { etiquetaVariante, type Material } from "@/lib/catalogo/catalogo";

export function SelectorVariante({ material }: { material: Material }) {
  const { variantes } = material;
  const primeraConStock = variantes.findIndex((v) => v.stock > 0);
  const [indice, setIndice] = useState(primeraConStock >= 0 ? primeraConStock : 0);
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  if (variantes.length === 0) {
    return <p className="text-[#8A8272]">Consultá disponibilidad con ventas.</p>;
  }

  const variante = variantes[indice];
  const sinStock = variante.stock <= 0;

  function elegir(i: number) {
    setIndice(i);
    setCantidad(1);
    setAgregado(false);
  }

  function cambiarCantidad(valor: number) {
    if (!Number.isFinite(valor)) return;
    setCantidad(Math.min(Math.max(1, Math.floor(valor)), Math.max(1, variante.stock)));
    setAgregado(false);
  }

  function agregar() {
    agregarItem({
      varianteId: variante.id,
      materialId: material.id,
      nombre: material.nombre,
      presentacion: etiquetaVariante(variante),
      precioVenta: variante.precioVenta,
      cantidad,
    });
    setAgregado(true);
  }

  return (
    <div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Presentación</legend>
        <div className="flex flex-wrap gap-2">
          {variantes.map((v, i) => (
            <label
              key={v.id}
              className={clsx(
                "cursor-pointer border px-4 py-2 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-dorado",
                i === indice
                  ? "border-dorado-oscuro bg-negro text-texto-claro"
                  : "border-[#E3DCCC] bg-white hover:border-dorado-oscuro",
                v.stock <= 0 && "opacity-60",
              )}
            >
              <input
                type="radio"
                name="presentacion"
                className="sr-only"
                checked={i === indice}
                onChange={() => elegir(i)}
              />
              {etiquetaVariante(v)}
            </label>
          ))}
        </div>
      </fieldset>

      <p className="mt-6 font-mono text-3xl font-medium text-dorado-oscuro">
        ${variante.precioVenta.toFixed(2)}
      </p>
      <div className="mt-2 flex items-center gap-3">
        <Badge tono={sinStock ? "alerta" : "exito"}>
          {sinStock ? "Sin stock" : `Stock: ${variante.stock}`}
        </Badge>
        <span className="font-mono text-xs text-[#8A8272]">{variante.skuVariante}</span>
      </div>

      <div className="mt-6 flex items-end gap-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Cantidad</span>
          <input
            type="number"
            min={1}
            max={Math.max(1, variante.stock)}
            value={cantidad}
            disabled={sinStock}
            onChange={(e) => cambiarCantidad(Number(e.target.value))}
            className="w-24 border border-[#E3DCCC] bg-white px-3 py-2 font-mono"
          />
        </label>
        <p className="pb-2 font-mono text-sm text-[#8A8272]">
          Subtotal de referencia: ${(variante.precioVenta * cantidad).toFixed(2)}
        </p>
      </div>

      <Button className="mt-6" disabled={sinStock} onClick={agregar}>
        Agregar a mi consulta
      </Button>

      {agregado && (
        <p role="status" className="mt-4 text-sm text-esmeralda">
          Agregado a tu consulta.{" "}
          <Link href="/catalogo" className="underline">
            Seguir viendo el catálogo
          </Link>
        </p>
      )}
    </div>
  );
}
