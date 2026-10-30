"use client";

import { dinero } from "@/lib/panel/carrito";
import { textoAtributos } from "@/lib/panel/materiales";
import { fechaHoraVE, reporteCompras } from "@/lib/panel/reportes";
import { Estado, Kpis, useCarga, Vacio } from "./comunes";

export function SeccionProveedores({ desde, hasta }: { desde: string; hasta: string }) {
  const { datos, error, cargando } = useCarga(`c|${desde}|${hasta}`, () => reporteCompras(desde, hasta));
  const sinCosto = datos?.porProveedor.reduce((a, p) => a + p.sinCosto, 0) ?? 0;
  return (
    <div className="space-y-8">
      <Estado cargando={cargando} error={error} />
      {datos && (
        <>
          <Kpis items={[
            ["Total pagado", dinero(datos.totalPagado)],
            ["Unidades compradas", String(datos.unidades)],
            ["Proveedores", String(datos.porProveedor.filter((p) => p.proveedorId).length)],
            ["Compras registradas", String(datos.detalle.length)],
          ]} />
          {sinCosto > 0 && (
            <p className="bg-white p-3 text-sm text-[#4A4538]">
              {sinCosto} {sinCosto === 1 ? "entrada no tiene" : "entradas no tienen"} costo registrado, así que no suman al total pagado. El costo se indica al registrar la entrada de mercancía.
            </p>
          )}
          <section>
            <h2 className="mb-3 font-serif text-lg font-semibold">Pagado por proveedor</h2>
            {datos.porProveedor.length === 0 ? <Vacio>No hubo compras en este período.</Vacio> : (
              <div className="overflow-x-auto bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-piedra-oscura text-xs uppercase text-[#8A8272]"><tr><th className="px-4 py-2">Proveedor</th><th className="px-4 py-2 text-right">Entradas</th><th className="px-4 py-2 text-right">Unidades</th><th className="px-4 py-2 text-right">Total pagado</th></tr></thead>
                  <tbody className="divide-y divide-piedra-oscura">
                    {datos.porProveedor.map((p) => (
                      <tr key={p.proveedorId ?? "ninguno"}><td className="px-4 py-2.5">{p.proveedor}</td><td className="px-4 py-2.5 text-right tabular-nums">{p.entradas}</td><td className="px-4 py-2.5 text-right tabular-nums">{p.unidades}</td><td className="px-4 py-2.5 text-right tabular-nums">{dinero(p.total)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          {datos.detalle.length > 0 && (
            <section>
              <h2 className="mb-3 font-serif text-lg font-semibold">Detalle de compras</h2>
              <div className="overflow-x-auto bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-piedra-oscura text-xs uppercase text-[#8A8272]"><tr><th className="px-4 py-2">Fecha</th><th className="px-4 py-2">Proveedor</th><th className="px-4 py-2">Producto</th><th className="px-4 py-2 text-right">Und.</th><th className="px-4 py-2 text-right">Costo unit.</th><th className="px-4 py-2 text-right">Total</th></tr></thead>
                  <tbody className="divide-y divide-piedra-oscura">
                    {datos.detalle.map((d, i) => (
                      <tr key={i}>
                        <td className="whitespace-nowrap px-4 py-2.5">{fechaHoraVE(d.fecha)}</td>
                        <td className="px-4 py-2.5">{d.proveedor ?? <span className="text-[#8A8272]">Sin indicar</span>}</td>
                        <td className="px-4 py-2.5">{d.material} <span className="text-[#8A8272]">· {textoAtributos(d.atributos) || d.sku}</span></td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{d.unidades}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{d.costoUnitario === null ? "—" : dinero(d.costoUnitario)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{d.total === null ? "—" : dinero(d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
