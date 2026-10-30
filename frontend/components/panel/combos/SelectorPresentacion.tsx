"use client";

import { useEffect, useState } from "react";
import { listarMaterialesAdmin, textoAtributos, type MaterialAdmin, type VarianteAdmin } from "@/lib/panel/materiales";
import { dinero } from "@/lib/panel/carrito";

/** Busca materiales activos y deja elegir una presentación concreta. */
export function SelectorPresentacion({
  yaElegidas,
  onElegir,
}: {
  yaElegidas: Set<string>;
  onElegir: (v: VarianteAdmin & { material: { id: string; nombre: string } }) => void;
}) {
  const [texto, setTexto] = useState("");
  const [buscar, setBuscar] = useState("");
  const [res, setRes] = useState<MaterialAdmin[] | "error" | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setBuscar(texto.trim()), 300);
    return () => clearTimeout(t);
  }, [texto]);

  useEffect(() => {
    if (buscar.length < 2) return;
    let vigente = true;
    listarMaterialesAdmin({ estado: "activos", buscar })
      .then((m) => vigente && setRes(m))
      .catch(() => vigente && setRes("error"));
    return () => {
      vigente = false;
    };
  }, [buscar]);

  const materiales = buscar.length >= 2 && Array.isArray(res) ? res : [];

  return (
    <div className="border border-piedra-oscura bg-white p-3">
      <label htmlFor="buscar-presentacion" className="mb-1 block text-sm font-medium">Agregar producto</label>
      <input
        id="buscar-presentacion"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Escribe el nombre o SKU (mín. 2 letras)"
        className="w-full rounded-sm border border-piedra-oscura px-3 py-2 text-sm"
      />
      {res === "error" && <p role="alert" className="mt-2 text-sm text-vino">No pudimos buscar. Intenta de nuevo.</p>}
      {buscar.length >= 2 && Array.isArray(res) && materiales.length === 0 && <p className="mt-2 text-sm text-[#8A8272]">Sin resultados.</p>}
      {materiales.length > 0 && (
        <ul className="mt-2 max-h-64 divide-y divide-piedra-oscura overflow-y-auto">
          {materiales.map((m) => (
            <li key={m.id} className="py-2">
              <p className="text-sm font-medium">{m.nombre}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {m.variantes.map((v) => {
                  const ya = yaElegidas.has(v.id);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={ya}
                      onClick={() => onElegir({ ...v, material: { id: m.id, nombre: m.nombre } })}
                      className="rounded-sm border border-piedra-oscura px-2.5 py-1 text-xs hover:border-negro disabled:opacity-40"
                    >
                      {textoAtributos(v.atributos) || v.skuVariante} · {dinero(v.precioVenta)} · stock {v.stock}
                      {ya && " ✓"}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
