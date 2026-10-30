"use client";

import { fechaHoraVE, reporteAsesorias } from "@/lib/panel/reportes";
import { Estado, Kpis, useCarga, Vacio } from "./comunes";

const ETIQUETA: Record<string, string> = { pendiente: "Pendiente", llamada_realizada: "Llamada realizada", visita_pactada: "Visita pactada", no_procede: "No procede", cancelada: "Cancelada" };

export function SeccionAsesorias({ desde, hasta }: { desde: string; hasta: string }) {
  const { datos, error, cargando } = useCarga(`a|${desde}|${hasta}`, () => reporteAsesorias(desde, hasta));
  return (
    <div className="space-y-8">
      <Estado cargando={cargando} error={error} />
      {datos && (
        <>
          <Kpis items={[
            ["Citas", String(datos.total)],
            ["Visitas pactadas", String(datos.porEstado.visita_pactada ?? 0)],
            ["Pendientes", String(datos.porEstado.pendiente ?? 0)],
            ["Conversión a visita", datos.conversionPct === null ? "—" : `${datos.conversionPct.toFixed(0)}%`],
          ]} />
          <p className="text-xs text-[#8A8272]">Se cuentan las citas cuya llamada cae dentro del rango. La conversión es visitas pactadas sobre las citas ya atendidas (llamada realizada, visita pactada o no procede).</p>

          <section>
            <h2 className="mb-3 font-serif text-lg font-semibold">Por asesor</h2>
            {datos.porAsesor.length === 0 ? <Vacio>No hubo citas en este período.</Vacio> : (
              <div className="overflow-x-auto bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-piedra-oscura text-xs uppercase text-[#8A8272]"><tr><th className="px-4 py-2">Asesor</th><th className="px-4 py-2 text-right">Total</th><th className="px-4 py-2 text-right">Pendientes</th><th className="px-4 py-2 text-right">Llamada realizada</th><th className="px-4 py-2 text-right">Visita pactada</th><th className="px-4 py-2 text-right">No procede</th><th className="px-4 py-2 text-right">Canceladas</th></tr></thead>
                  <tbody className="divide-y divide-piedra-oscura">
                    {datos.porAsesor.map((r) => (
                      <tr key={r.asesor}><td className="px-4 py-2.5">{r.asesor}</td><td className="px-4 py-2.5 text-right tabular-nums">{r.total}</td><td className="px-4 py-2.5 text-right tabular-nums">{r.pendiente}</td><td className="px-4 py-2.5 text-right tabular-nums">{r.llamadaRealizada}</td><td className="px-4 py-2.5 text-right tabular-nums">{r.visitaPactada}</td><td className="px-4 py-2.5 text-right tabular-nums">{r.noProcede}</td><td className="px-4 py-2.5 text-right tabular-nums">{r.cancelada}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {datos.detalle.length > 0 && (
            <section>
              <h2 className="mb-3 font-serif text-lg font-semibold">Citas</h2>
              <div className="overflow-x-auto bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-piedra-oscura text-xs uppercase text-[#8A8272]"><tr><th className="px-4 py-2">Llamada</th><th className="px-4 py-2">Cliente</th><th className="px-4 py-2">Asesor</th><th className="px-4 py-2">Estado</th></tr></thead>
                  <tbody className="divide-y divide-piedra-oscura">
                    {datos.detalle.map((d, i) => (
                      <tr key={i}><td className="whitespace-nowrap px-4 py-2.5">{fechaHoraVE(d.fecha)}</td><td className="px-4 py-2.5">{d.cliente}<span className="block font-mono text-xs text-[#8A8272]">{d.telefono}</span></td><td className="px-4 py-2.5">{d.asesor}</td><td className="px-4 py-2.5">{ETIQUETA[d.estado] ?? d.estado}</td></tr>
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
