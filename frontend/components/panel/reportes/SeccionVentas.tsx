"use client";

import Link from "next/link";
import { dinero } from "@/lib/panel/carrito";
import { ETIQUETA_METODO, type MetodoPago } from "@/lib/panel/carrito";
import { etiquetaPeriodo, horaVE, reporteGanancias, reporteVentas, type Agrupacion } from "@/lib/panel/reportes";
import { Barra, Estado, Kpis, useCarga, Vacio } from "./comunes";

export type ModoVentas = "dia" | Agrupacion;

const pct = (g: number, v: number) => (v > 0 ? `${((g / v) * 100).toFixed(1)}%` : "—");

function Diario({ dia }: { dia: string }) {
  const { datos, error, cargando } = useCarga(`v|${dia}`, () => reporteVentas(dia, dia));
  const v = datos ?? [];
  const ventas = v.reduce((a, x) => a + x.ventas, 0);
  const ganancia = v.reduce((a, x) => a + x.ganancia, 0);
  return (
    <div className="space-y-6">
      <Estado cargando={cargando} error={error} />
      {datos && (
        <>
          <Kpis items={[["Ventas", dinero(ventas)], ["Ganancia", dinero(ganancia)], ["Margen", pct(ganancia, ventas)], ["Pedidos", String(v.length)]]} />
          <section>
            <h2 className="mb-3 font-serif text-lg font-semibold">Ventas del día</h2>
            {v.length === 0 ? (
              <Vacio>No hubo ventas este día.</Vacio>
            ) : (
              <div className="overflow-x-auto bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-piedra-oscura text-xs uppercase text-[#8A8272]">
                    <tr><th className="px-4 py-2">Pedido</th><th className="px-4 py-2">Hora</th><th className="px-4 py-2">Cliente</th><th className="px-4 py-2">Pago</th><th className="px-4 py-2 text-right">Vendido</th><th className="px-4 py-2 text-right">Ganancia</th></tr>
                  </thead>
                  <tbody className="divide-y divide-piedra-oscura">
                    {v.map((x) => (
                      <tr key={x.solicitudId} className="hover:bg-[#FAF7F0]">
                        <td className="px-4 py-3 font-mono"><Link href={`/panel/carrito/${x.solicitudId}`} className="underline" aria-label={`Abrir pedido ${x.numero}`}>Nº {x.numero}</Link></td>
                        <td className="px-4 py-3">{horaVE(x.fecha)}</td>
                        <td className="px-4 py-3">{x.cliente}</td>
                        <td className="px-4 py-3 text-xs">{x.metodoPago ? ETIQUETA_METODO[x.metodoPago as MetodoPago] ?? x.metodoPago : "—"}{x.referenciaPago && <span className="block font-mono text-[#8A8272]">Ref. {x.referenciaPago}</span>}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{dinero(x.ventas)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{dinero(x.ganancia)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Periodos({ desde, hasta, agrupacion }: { desde: string; hasta: string; agrupacion: Agrupacion }) {
  const { datos, error, cargando } = useCarga(`g|${desde}|${hasta}|${agrupacion}`, () => reporteGanancias(desde, hasta, agrupacion));
  const max = datos ? Math.max(...datos.serie.map((s) => s.ventas), 0) : 0;
  return (
    <div className="space-y-8">
      <Estado cargando={cargando} error={error} />
      {datos && (
        <>
          <Kpis items={[["Ventas", dinero(datos.totalVentas)], ["Costo", dinero(datos.totalCosto)], ["Ganancia", dinero(datos.ganancia)], ["Margen", pct(datos.ganancia, datos.totalVentas)]]} />
          <section>
            <h2 className="mb-1 font-serif text-lg font-semibold">Ventas y ganancia</h2>
            <p className="mb-3 flex gap-4 text-xs text-[#8A8272]"><span><i className="mr-1 inline-block h-2.5 w-2.5 bg-dorado-oscuro" />Ventas</span><span><i className="mr-1 inline-block h-2.5 w-2.5 bg-esmeralda" />Ganancia</span></p>
            {datos.serie.length === 0 ? (
              <Vacio>No hubo ventas en este período.</Vacio>
            ) : (
              <ul className="space-y-3 bg-white p-4">
                {datos.serie.map((s) => (
                  <li key={s.periodo} className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:items-center">
                    <span className="text-sm font-medium">{etiquetaPeriodo(s.periodo, agrupacion)}</span>
                    <div className="space-y-1">
                      <Barra valor={s.ventas} max={max} clase="bg-dorado-oscuro" texto={dinero(s.ventas)} />
                      <Barra valor={s.ganancia} max={max} clase={s.ganancia >= 0 ? "bg-esmeralda" : "bg-vino"} texto={dinero(s.ganancia)} />
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

export function SeccionVentas({ modo, desde, hasta }: { modo: ModoVentas; desde: string; hasta: string }) {
  return modo === "dia" ? <Diario dia={desde} /> : <Periodos desde={desde} hasta={hasta} agrupacion={modo} />;
}
