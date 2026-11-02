"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/panel/carrito/Dialogos";
import { dinero } from "@/lib/panel/carrito";
import { cargarCatalogoParaPresupuesto, type OpcionCatalogo } from "@/lib/panel/presupuestos";

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Busca productos y combos del catálogo y los agrega como líneas (se puede agregar varios seguidos). */
export function SelectorProducto({ onElegir, onCerrar }: { onElegir: (o: OpcionCatalogo) => void; onCerrar: () => void }) {
  const [catalogo, setCatalogo] = useState<OpcionCatalogo[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const [buscar, setBuscar] = useState("");
  const [agregados, setAgregados] = useState<Record<string, number>>({});

  useEffect(() => {
    let vigente = true;
    cargarCatalogoParaPresupuesto()
      .then((c) => vigente && setCatalogo(c))
      .catch(() => vigente && setFallo(true));
    return () => {
      vigente = false;
    };
  }, []);

  const visibles = useMemo(() => {
    if (!catalogo) return [];
    const q = sinTildes(buscar.trim());
    const filtrados = q ? catalogo.filter((o) => sinTildes(`${o.descripcion} ${o.sku ?? ""} ${o.categoria ?? ""}`).includes(q)) : catalogo;
    return filtrados.slice(0, 60);
  }, [catalogo, buscar]);

  const total = Object.values(agregados).reduce((a, b) => a + b, 0);

  return (
    <Modal titulo="Agregar productos del catálogo" onCerrar={onCerrar} ancho="max-w-2xl">
      <label htmlFor="buscar-producto" className="mb-1.5 block text-sm font-medium">Buscar por nombre, presentación, SKU o categoría</label>
      <input
        id="buscar-producto"
        autoFocus
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
        placeholder="cemento, porcelanato, tubo…"
        className="w-full rounded-sm border border-piedra-oscura bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-dorado"
      />
      {fallo && <p role="alert" className="mt-3 text-vino">No pudimos cargar el catálogo. Cierra y vuelve a abrir.</p>}
      {!catalogo && !fallo && <p className="mt-3 text-[#8A8272]">Cargando catálogo…</p>}
      {catalogo && visibles.length === 0 && <p className="mt-3 text-[#8A8272]">No hay productos que coincidan.</p>}
      {visibles.length > 0 && (
        <ul className="mt-3 max-h-[50vh] divide-y divide-piedra-oscura overflow-y-auto bg-white">
          {visibles.map((o) => (
            <li key={o.clave} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{o.descripcion}</p>
                <p className="text-xs text-[#8A8272]">
                  {[o.categoria, o.sku, o.stock !== undefined ? `stock ${o.stock}` : null].filter(Boolean).join(" · ")}
                </p>
              </div>
              <p className="font-mono text-sm">{dinero(o.precio)}</p>
              <button
                type="button"
                onClick={() => {
                  onElegir(o);
                  setAgregados((a) => ({ ...a, [o.clave]: (a[o.clave] ?? 0) + 1 }));
                }}
                className="rounded-sm border border-negro px-3 py-1.5 text-sm hover:bg-negro hover:text-texto-claro"
              >
                Agregar{agregados[o.clave] ? ` (${agregados[o.clave]})` : ""}
              </button>
            </li>
          ))}
        </ul>
      )}
      {catalogo && catalogo.length > visibles.length && !buscar && <p className="mt-2 text-xs text-[#8A8272]">Se muestran los primeros 60: usa el buscador para encontrar el resto.</p>}
      <div className="mt-4 flex items-center justify-between gap-3">
        <p role="status" className="text-sm text-[#4A4538]">{total > 0 ? `${total} agregado${total === 1 ? "" : "s"} al presupuesto.` : ""}</p>
        <Button type="button" onClick={onCerrar}>Listo</Button>
      </div>
    </Modal>
  );
}
