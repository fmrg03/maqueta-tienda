"use client";

import Link from "next/link";
import { PrecioBs } from "@/components/ui/PrecioBs";
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
    return <p className="text-apagado">Consulta disponibilidad con ventas.</p>;
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
      tipo: "variante",
      refId: variante.id,
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
        <legend className="mb-2 text-sm font-medium text-texto-secundario">Presentación</legend>
        <div className="flex flex-wrap gap-2">
          {variantes.map((v, i) => (
            <label
              key={v.id}
              className={clsx(
                "cursor-pointer border px-4 py-2 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-dorado",
                i === indice
                  ? "border-dorado-claro bg-dorado-claro text-negro font-medium"
                  : "border-linea bg-negro-suave text-texto-claro hover:border-dorado-oscuro",
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

      <p className="mt-6 font-mono text-4xl font-medium text-dorado-claro">
        ${variante.precioVenta.toFixed(2)}
      </p>
      <PrecioBs usd={variante.precioVenta} className="font-mono text-sm text-apagado" />
      <div className="mt-2 flex items-center gap-3">
        <Badge oscuro tono={sinStock ? "alerta" : "exito"}>
          {sinStock ? "Sin stock" : `Stock: ${variante.stock}`}
        </Badge>
        <span className="font-mono text-xs text-apagado">{variante.skuVariante}</span>
      </div>

      <div className="mt-6 flex items-end gap-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-texto-secundario">Cantidad</span>
          <input
            type="number"
            min={1}
            max={Math.max(1, variante.stock)}
            value={cantidad}
            disabled={sinStock}
            onChange={(e) => cambiarCantidad(Number(e.target.value))}
            className="w-24 border border-linea bg-negro-suave px-3 py-2 font-mono text-texto-claro focus-visible:outline focus-visible:outline-2 focus-visible:outline-dorado"
          />
        </label>
        <p className="pb-2 font-mono text-sm text-apagado">
          Subtotal de referencia: ${(variante.precioVenta * cantidad).toFixed(2)}{" "}
          <PrecioBs usd={variante.precioVenta * cantidad} />
        </p>
      </div>

      {/* En móvil el botón queda fijo abajo (con espacio a la derecha para el de WhatsApp). */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-negro/95 p-3 pr-20 backdrop-blur md:static md:z-auto md:mt-6 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Button className="w-full md:w-auto" disabled={sinStock} onClick={agregar}>
          {sinStock ? "Sin stock" : "Agregar a mi consulta"}
        </Button>
      </div>

      {agregado && (
        <p role="status" className="mt-4 text-sm text-[#7fd1a8]">
          Agregado a tu consulta.{" "}
          <Link href="/catalogo" className="underline">
            Seguir viendo el catálogo
          </Link>
        </p>
      )}
    </div>
  );
}
