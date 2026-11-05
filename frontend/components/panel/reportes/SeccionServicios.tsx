"use client";

import Link from "next/link";
import { dinero } from "@/lib/panel/carrito";
import { fechaHoraVE, reporteServicios } from "@/lib/panel/reportes";
import { Estado, Kpis, useCarga, Vacio } from "./comunes";

/** Mano de obra: se cobra y cuenta como ingreso, pero no entra en la ganancia de productos. */
export function SeccionServicios({ desde, hasta }: { desde: string; hasta: string }) {
  const { datos, error, cargando } = useCarga(`s|${desde}|${hasta}`, () => reporteServicios(desde, hasta));
  return (
    <div className="space-y-8">
      <Estado cargando={cargando} error={error} />
      {datos && (
        <>
          <Kpis items={[
            ["Cobrado por servicios", dinero(datos.ingreso)],
            ["Pagado a trabajadores", dinero(datos.costo)],
            ["Resultado de servicios", dinero(datos.resultado)],
            ["Pedidos con servicios", String(datos.pedidos)],
          ]} />
          <p className="bg-white p-3 text-sm text-[#4A4538]">
            Los servicios no se suman a la ganancia de «Ventas y ganancia», que cuenta solo productos. El resultado de servicios es lo cobrado menos lo pagado a trabajadores, y solo incluye los pedidos que ya tienen ese pago registrado.
          </p>
          {datos.sinCosto > 0 && (
            <p role="status" className="border-l-4 border-dorado-oscuro bg-white p-3 text-sm text-[#4A4538]">
              {datos.sinCosto} {datos.sinCosto === 1 ? "pedido no tiene" : "pedidos no tienen"} registrado lo pagado a trabajadores. Ábrelo y anótalo en «Pago a trabajadores» para completar el resultado.
            </p>
          )}
          <section>
            <h2 className="mb-3 font-serif text-lg font-semibold">Servicios por pedido</h2>
            {datos.detalle.length === 0 ? (
              <Vacio>No se cobraron servicios en este período.</Vacio>
            ) : (
              <div className="overflow-x-auto bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-piedra-oscura text-xs uppercase text-[#8A8272]">
                    <tr><th className="px-4 py-2">Pedido</th><th className="px-4 py-2">Fecha</th><th className="px-4 py-2">Cliente</th><th className="px-4 py-2 text-right">Cobrado</th><th className="px-4 py-2 text-right">Pagado a trabajadores</th><th className="px-4 py-2 text-right">Resultado</th></tr>
                  </thead>
                  <tbody className="divide-y divide-piedra-oscura">
                    {datos.detalle.map((d) => (
                      <tr key={d.solicitudId} className="hover:bg-[#FAF7F0]">
                        <td className="px-4 py-3 font-mono"><Link href={`/panel/carrito/${d.solicitudId}`} className="underline" aria-label={`Abrir pedido ${d.numero}`}>Nº {d.numero}</Link></td>
                        <td className="whitespace-nowrap px-4 py-3">{fechaHoraVE(d.fecha)}</td>
                        <td className="px-4 py-3">{d.cliente}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{dinero(d.ingreso)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{d.costo === null ? <span className="text-vino">Sin registrar</span> : dinero(d.costo)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{d.resultado === null ? "—" : dinero(d.resultado)}</td>
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
