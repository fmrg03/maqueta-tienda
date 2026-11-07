"use client";

import Link from "next/link";
import { dinero, ETIQUETA_METODO, type MetodoPago } from "@/lib/panel/carrito";
import { fechaHoraVE, reporteDetalleVentas } from "@/lib/panel/reportes";
import { Estado, Kpis, useCarga, Vacio } from "./comunes";

const metodo = (m: string) => ETIQUETA_METODO[m as MetodoPago] ?? m;
const attrs = (a: Record<string, string>) => Object.values(a ?? {}).join(" / ");
const bs = (n: number) => `Bs. ${new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2 }).format(n)}`;

/** Ventas cerradas del período: qué se vendió, cómo se recibió el dinero y el detalle de cada una. */
export function SeccionDetalleVentas({ desde, hasta }: { desde: string; hasta: string }) {
  const { datos, error, cargando } = useCarga(`dv|${desde}|${hasta}`, () => reporteDetalleVentas(desde, hasta));
  return (
    <div className="space-y-8">
      <Estado cargando={cargando} error={error} />
      {datos && (
        <>
          <Kpis items={[
            ["Ventas cerradas", String(datos.ventas)],
            ["Dinero recibido", dinero(datos.cobrado)],
            ["Productos distintos", String(datos.productos.length)],
          ]} />

          <section>
            <h2 className="mb-3 font-serif text-lg font-semibold">Cómo se recibió el dinero</h2>
            {datos.porMetodo.length === 0 ? (
              <Vacio>No hay pagos en este período.</Vacio>
            ) : (
              <div className="overflow-x-auto bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-piedra-oscura text-xs uppercase text-[#8A8272]">
                    <tr><th className="px-4 py-2">Método</th><th className="px-4 py-2 text-right">Pagos</th><th className="px-4 py-2 text-right">Recibido (USD)</th><th className="px-4 py-2 text-right">En bolívares</th></tr>
                  </thead>
                  <tbody className="divide-y divide-piedra-oscura">
                    {datos.porMetodo.map((m) => (
                      <tr key={m.metodo}>
                        <td className="px-4 py-3">{metodo(m.metodo)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{m.pagos}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{dinero(m.monto)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{m.montoBs > 0 ? bs(m.montoBs) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-serif text-lg font-semibold">Productos vendidos</h2>
            {datos.productos.length === 0 ? (
              <Vacio>No se vendieron productos en este período.</Vacio>
            ) : (
              <div className="overflow-x-auto bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-piedra-oscura text-xs uppercase text-[#8A8272]">
                    <tr><th className="px-4 py-2">Producto</th><th className="px-4 py-2">SKU</th><th className="px-4 py-2 text-right">Unidades</th><th className="px-4 py-2 text-right">Vendido</th></tr>
                  </thead>
                  <tbody className="divide-y divide-piedra-oscura">
                    {datos.productos.map((p) => (
                      <tr key={p.sku}>
                        <td className="px-4 py-3">{p.producto}{attrs(p.atributos) && <span className="text-[#8A8272]"> — {attrs(p.atributos)}</span>}</td>
                        <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{p.unidades}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{dinero(p.ventas)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-serif text-lg font-semibold">Detalle de cada venta</h2>
            {datos.detalle.length === 0 ? (
              <Vacio>No hay ventas cerradas en este período.</Vacio>
            ) : (
              <ul className="space-y-3">
                {datos.detalle.map((v) => (
                  <li key={v.solicitudId} className="bg-white p-4 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p>
                        <Link href={`/panel/carrito/${v.solicitudId}`} className="font-mono underline">Nº {v.numero}</Link>{" "}
                        <strong>{v.cliente}</strong>
                        <span className="ml-2 text-xs text-[#8A8272]">{fechaHoraVE(v.fecha)}</span>
                      </p>
                      <p className="font-mono text-base font-semibold">{dinero(v.cobrado)}</p>
                    </div>
                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      <div>
                        <h3 className="mb-1 text-xs uppercase text-[#8A8272]">Vendido</h3>
                        <ul className="space-y-0.5">
                          {v.productos.map((p) => (
                            <li key={p.sku} className="flex justify-between gap-3">
                              <span>{p.cantidad} × {p.producto}{attrs(p.atributos) && ` — ${attrs(p.atributos)}`}</span>
                              <span className="font-mono">{dinero(p.total)}</span>
                            </li>
                          ))}
                          {v.servicios.map((s, i) => (
                            <li key={i} className="flex justify-between gap-3">
                              <span>Servicio: {s.descripcion} ({s.cantidad} {s.unidad})</span>
                              <span className="font-mono">{dinero(s.total)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="mb-1 text-xs uppercase text-[#8A8272]">Pagos recibidos</h3>
                        <ul className="space-y-0.5">
                          {v.pagos.map((p, i) => (
                            <li key={i} className="flex justify-between gap-3">
                              <span>{metodo(p.metodo)}{p.referencia && <span className="text-[#8A8272]"> · ref. {p.referencia}</span>}{p.montoBs !== null && <span className="text-[#8A8272]"> · {bs(p.montoBs)}</span>}</span>
                              <span className="font-mono">{dinero(p.monto)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
