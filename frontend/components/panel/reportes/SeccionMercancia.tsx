"use client";

import { dinero } from "@/lib/panel/carrito";
import { textoAtributos } from "@/lib/panel/materiales";
import { etiquetaPeriodo, reporteInventario, reporteMasVendidos, reporteStock, type Agrupacion, type StockItem } from "@/lib/panel/reportes";
import { Barra, Estado, Kpis, useCarga, Vacio } from "./comunes";

const nombre = (i: { material: string; atributos: Record<string, string>; sku: string }) =>
  `${i.material} — ${textoAtributos(i.atributos) || i.sku}`;

function ListaStock({ titulo, items, vacio }: { titulo: string; items: StockItem[]; vacio: string }) {
  return (
    <section>
      <h2 className="mb-3 font-serif text-lg font-semibold">{titulo}</h2>
      {items.length === 0 ? <Vacio>{vacio}</Vacio> : (
        <ul className="divide-y divide-piedra-oscura bg-white">
          {items.slice(0, 15).map((i) => (
            <li key={i.sku} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span>{nombre(i)}</span><span className="font-mono">{i.stock} und.</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SeccionMercancia({ desde, hasta, agrupacion }: { desde: string; hasta: string; agrupacion: Agrupacion }) {
  const mov = useCarga(`m|${desde}|${hasta}|${agrupacion}`, () => reporteInventario(desde, hasta, agrupacion));
  const top = useCarga(`t|${desde}|${hasta}`, () => reporteMasVendidos(desde, hasta));
  const stock = useCarga("s", reporteStock);
  const max = mov.datos ? Math.max(...mov.datos.flatMap((s) => [s.entradas, s.salidas]), 0) : 0;
  const agotados = stock.datos?.items.filter((i) => i.stock === 0) ?? [];

  return (
    <div className="space-y-8">
      <Estado cargando={mov.cargando || top.cargando || stock.cargando} error={mov.error || top.error || stock.error} />
      {stock.datos && (
        <Kpis items={[
          ["Unidades en stock", String(stock.datos.unidades)],
          ["Valor a costo", dinero(stock.datos.valorCosto)],
          ["Valor a precio de venta", dinero(stock.datos.valorVenta)],
          ["Agotados", String(stock.datos.agotados)],
        ]} />
      )}

      {mov.datos && (
        <section>
          <h2 className="mb-1 font-serif text-lg font-semibold">Entradas y salidas de mercancía</h2>
          <p className="mb-3 flex gap-4 text-xs text-[#8A8272]"><span><i className="mr-1 inline-block h-2.5 w-2.5 bg-negro" />Entradas</span><span><i className="mr-1 inline-block h-2.5 w-2.5 bg-dorado-oscuro" />Salidas</span></p>
          {mov.datos.length === 0 ? <Vacio>No hubo movimientos en este período.</Vacio> : (
            <ul className="space-y-3 bg-white p-4">
              {mov.datos.map((s) => (
                <li key={s.periodo} className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:items-center">
                  <span className="text-sm font-medium">{etiquetaPeriodo(s.periodo, agrupacion)}</span>
                  <div className="space-y-1">
                    <Barra valor={s.entradas} max={max} clase="bg-negro" texto={`${s.entradas} und.`} />
                    <Barra valor={s.salidas} max={max} clase="bg-dorado-oscuro" texto={`${s.salidas} und.`} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {top.datos && (
        <section>
          <h2 className="mb-3 font-serif text-lg font-semibold">Lo más vendido</h2>
          {top.datos.length === 0 ? <Vacio>No hubo ventas en este período.</Vacio> : (
            <div className="overflow-x-auto bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-piedra-oscura text-xs uppercase text-[#8A8272]"><tr><th className="px-4 py-2">Producto</th><th className="px-4 py-2 text-right">Unidades</th><th className="px-4 py-2 text-right">Vendido</th><th className="px-4 py-2 text-right">Ganancia</th></tr></thead>
                <tbody className="divide-y divide-piedra-oscura">
                  {top.datos.map((t) => (
                    <tr key={t.sku}><td className="px-4 py-2.5">{nombre(t)}</td><td className="px-4 py-2.5 text-right tabular-nums">{t.unidades}</td><td className="px-4 py-2.5 text-right tabular-nums">{dinero(t.ventas)}</td><td className="px-4 py-2.5 text-right tabular-nums">{dinero(t.ganancia)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {stock.datos && (
        <div className="grid gap-6 md:grid-cols-2">
          <ListaStock titulo="Agotados" items={agotados} vacio="No hay productos agotados." />
          <ListaStock titulo="Quedan pocas unidades (5 o menos)" items={stock.datos.pocoStock} vacio="Ningún producto con poco stock." />
        </div>
      )}
    </div>
  );
}
