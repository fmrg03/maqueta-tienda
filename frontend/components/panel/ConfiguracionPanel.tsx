"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api/client";
import {
  actualizarTasa,
  descuentoGlobal,
  fijarDescuentoGlobal,
  fijarTasaManual,
  historialTasas,
  tasaVigente,
  type FilaTasa,
} from "@/lib/panel/configuracion";
import { ETIQUETA_METODO, type MetodoPago } from "@/lib/panel/carrito";
import { fechaTasa, type TasaBcv } from "@/lib/tasas/tasas";

const msg = (e: unknown) => (e instanceof ApiError ? e.message : "No pudimos completar la acción. Inténtalo de nuevo.");

export function ConfiguracionPanel() {
  const [tasa, setTasa] = useState<TasaBcv | null | undefined>(undefined);
  const [historial, setHistorial] = useState<FilaTasa[]>([]);
  const [pct, setPct] = useState<string | null>(null);
  const [pctActual, setPctActual] = useState<number | null>(null);
  const [metodos, setMetodos] = useState<MetodoPago[] | null>(null);
  const [manual, setManual] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    tasaVigente().then((t) => vigente && setTasa(t));
    historialTasas().then((h) => vigente && setHistorial(h)).catch(() => undefined);
    descuentoGlobal()
      .then((d) => {
        if (!vigente) return;
        setPctActual(d.porcentaje);
        setMetodos(d.metodos);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  async function ejecutar(nombre: string, fn: () => Promise<void>) {
    setOcupado(nombre);
    setError(null);
    setAviso(null);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      setError(msg(e));
    } finally {
      setOcupado(null);
    }
  }

  const recargarHistorial = () => historialTasas().then(setHistorial).catch(() => undefined);

  const pctTexto = pct ?? (pctActual !== null ? String(pctActual) : "");

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-[26px] font-semibold">Configuración</h1>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <p className="mb-8 text-[#8A8272]">Ajustes globales de la tienda: aplican a toda la web y a las ventas nuevas.</p>

      {error && <p role="alert" className="mb-4 text-vino">{error}</p>}
      {aviso && <p role="status" className="mb-4 border-l-4 border-esmeralda bg-white px-3 py-2 text-sm">{aviso}</p>}

      <section aria-labelledby="desc" className="mb-10 bg-white p-5">
        <h2 id="desc" className="font-semibold">Descuento global</h2>
        <p className="mt-1 text-sm text-[#4A4538]">
          Porcentaje que se descuenta al cerrar una venta pagada con alguno de los métodos que marques abajo. El
          asesor puede desmarcarlo en una venta puntual. Cambiarlo no altera ventas ya cerradas. Con 0, o sin ningún método marcado, no se aplica ni se anuncia en la web.
        </p>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(pctTexto);
            if (pctTexto.trim() === "" || Number.isNaN(n) || n < 0 || n > 100) {
              setError("Escribe un porcentaje entre 0 y 100.");
              return;
            }
            ejecutar("pct", async () => {
              const v = await fijarDescuentoGlobal(n, metodos ?? []);
              setPctActual(v.porcentaje);
              setMetodos(v.metodos);
              setPct(null);
              setAviso(`Descuento fijado en ${v.porcentaje}% para ${v.metodos.length} método(s) de pago.`);
            });
          }}
        >
          <div className="w-40">
            <Input label="Porcentaje (%)" name="pct" inputMode="decimal" value={pctTexto} onChange={(e) => setPct(e.target.value)} />
          </div>
          <fieldset className="w-full">
            <legend className="mb-2 text-sm font-medium">Aplica a estos métodos de pago</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {(Object.entries(ETIQUETA_METODO) as [MetodoPago, string][]).map(([valor, etiqueta]) => (
                <label key={valor} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={metodos?.includes(valor) ?? false}
                    disabled={metodos === null}
                    onChange={(e) =>
                      setMetodos((actual) =>
                        e.target.checked ? [...(actual ?? []), valor] : (actual ?? []).filter((m) => m !== valor),
                      )
                    }
                    className="h-4 w-4 accent-dorado-oscuro"
                  />
                  {etiqueta}
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" disabled={ocupado !== null || pctActual === null || metodos === null}>
            {ocupado === "pct" ? "Guardando…" : "Guardar"}
          </Button>
        </form>
      </section>

      <section aria-labelledby="tasa" className="bg-white p-5">
        <h2 id="tasa" className="font-semibold">Tasa BCV</h2>
        {tasa === undefined && <p className="mt-2 text-[#8A8272]">Cargando…</p>}
        {tasa === null && (
          <p className="mt-2 text-sm text-vino">
            No hay tasa disponible: no se pudo consultar la fuente y no hay ninguna guardada. Fíjala a mano o actualiza más tarde.
          </p>
        )}
        {tasa && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="font-mono text-3xl font-medium text-dorado-oscuro">{tasa.valor.toFixed(2)} <span className="text-base">Bs/USD</span></p>
            <Badge tono={tasa.fuente === "manual" ? "dorado" : "neutro"}>{tasa.fuente === "manual" ? "manual" : "BCV"}</Badge>
            {tasa.desactualizada && <Badge tono="alerta">sin confirmar &gt; 24 h</Badge>}
            <span className="font-mono text-xs text-[#8A8272]">{fechaTasa(tasa.fecha)}</span>
          </div>
        )}
        <p className="mt-2 text-sm text-[#4A4538]">
          Se consulta automáticamente cada hora y cada cambio queda en el historial. Una tasa fijada a mano manda durante 24 horas.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Button
            variante="secundario"
            disabled={ocupado !== null}
            onClick={() =>
              ejecutar("act", async () => {
                const t = await actualizarTasa();
                setTasa(t);
                await recargarHistorial();
                setAviso(t ? "Tasa actualizada desde la fuente." : "No se pudo consultar la fuente.");
              })
            }
          >
            {ocupado === "act" ? "Consultando…" : "Actualizar ahora"}
          </Button>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(manual.replace(",", "."));
              if (manual.trim() === "" || Number.isNaN(n) || n <= 0) {
                setError("Escribe una tasa válida, por ejemplo 301,37.");
                return;
              }
              ejecutar("manual", async () => {
                const t = await fijarTasaManual(n);
                setTasa(t);
                setManual("");
                await recargarHistorial();
                setAviso(`Tasa fijada a mano en ${t.valor.toFixed(2)}.`);
              });
            }}
          >
            <div className="w-40">
              <Input label="Fijar a mano" name="manual" inputMode="decimal" placeholder="301,37" value={manual} onChange={(e) => setManual(e.target.value)} />
            </div>
            <Button type="submit" variante="secundario" disabled={ocupado !== null}>Fijar</Button>
          </form>
        </div>

        {historial.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <h3 className="mb-2 text-sm font-semibold">Historial</h3>
            <table className="w-full min-w-[22rem] text-sm">
              <thead>
                <tr className="text-left font-mono text-xs text-[#8A8272]">
                  <th className="py-1 font-normal">Registrada</th>
                  <th className="py-1 text-right font-normal">Bs/USD</th>
                  <th className="py-1 pl-4 font-normal">Fuente</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((f) => (
                  <tr key={f.id} className="border-t border-piedra-oscura">
                    <td className="py-1.5 font-mono text-xs">{fechaTasa(f.createdAt)}</td>
                    <td className="py-1.5 text-right font-mono">{f.valor.toFixed(2)}</td>
                    <td className="py-1.5 pl-4">{f.fuente === "manual" ? "Manual" : "BCV"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
