"use client";

import { useState } from "react";
import { PrecioBs } from "@/components/ui/PrecioBs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { agregarItem } from "@/lib/carrito/carrito-store";
import { lineaItemCombo, precioPorSeparado, type Combo } from "@/lib/catalogo/combos";
import Link from "next/link";

export function TarjetaCombo({ combo }: { combo: Combo }) {
  const [agregado, setAgregado] = useState(false);
  const separado = precioPorSeparado(combo);
  const ahorro = separado - combo.precioCombo;
  const disponible = combo.items.every((i) => i.variante.stock >= i.cantidad);

  function agregar() {
    agregarItem({
      tipo: "combo",
      refId: combo.id,
      nombre: combo.nombre,
      presentacion: "Combo",
      precioVenta: combo.precioCombo,
      cantidad: 1,
    });
    setAgregado(true);
  }

  return (
    <article className="flex h-full flex-col border border-linea bg-negro-suave p-6 transition-colors hover:border-dorado-oscuro">
      <h2 className="font-serif text-xl font-semibold">{combo.nombre}</h2>
      {combo.descripcion && <p className="mt-1 text-sm text-texto-secundario">{combo.descripcion}</p>}

      <ul className="mt-4 space-y-1 border-t border-linea pt-4 text-sm text-texto-secundario">
        {combo.items.map((i) => (
          <li key={i.id}>{lineaItemCombo(i)}</li>
        ))}
      </ul>

      <div className="mb-6 mt-5">
        <p className="font-mono text-2xl font-medium text-dorado-claro">
          ${combo.precioCombo.toFixed(2)}
        </p>
        <PrecioBs usd={combo.precioCombo} className="font-mono text-xs text-apagado" />
        {ahorro > 0 && (
          <p className="mt-1 font-mono text-xs text-apagado">
            Por separado: <s>${separado.toFixed(2)}</s> · ahorras ${ahorro.toFixed(2)}
          </p>
        )}
        <div className="mt-2">
          <Badge oscuro tono={disponible ? "exito" : "alerta"}>
            {disponible ? "Disponible" : "Stock limitado"}
          </Badge>
        </div>
      </div>

      <Button className="mt-auto" onClick={agregar}>
        Agregar a mi consulta
      </Button>
      {agregado && (
        <p role="status" className="mt-3 text-sm text-[#7fd1a8]">
          Agregado.{" "}
          <Link href="/consulta" className="underline">
            Ver mi consulta
          </Link>
        </p>
      )}
    </article>
  );
}
