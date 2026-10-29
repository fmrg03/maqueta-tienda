"use client";

import { useState } from "react";
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
    <article className="flex flex-col bg-white p-6">
      <h2 className="font-serif text-xl font-semibold">{combo.nombre}</h2>
      {combo.descripcion && <p className="mt-1 text-sm text-[#4A4538]">{combo.descripcion}</p>}

      <ul className="mt-4 space-y-1 border-t border-piedra-oscura pt-4 text-sm">
        {combo.items.map((i) => (
          <li key={i.id}>{lineaItemCombo(i)}</li>
        ))}
      </ul>

      <div className="mt-5">
        <p className="font-mono text-2xl font-medium text-dorado-oscuro">
          ${combo.precioCombo.toFixed(2)}
        </p>
        {ahorro > 0 && (
          <p className="mt-1 font-mono text-xs text-[#8A8272]">
            Por separado: <s>${separado.toFixed(2)}</s> · ahorras ${ahorro.toFixed(2)}
          </p>
        )}
        <div className="mt-2">
          <Badge tono={disponible ? "exito" : "alerta"}>
            {disponible ? "Disponible" : "Stock limitado"}
          </Badge>
        </div>
      </div>

      <Button className="mt-6" onClick={agregar}>
        Agregar a mi consulta
      </Button>
      {agregado && (
        <p role="status" className="mt-3 text-sm text-esmeralda">
          Agregado.{" "}
          <Link href="/consulta" className="underline">
            Ver mi consulta
          </Link>
        </p>
      )}
    </article>
  );
}
