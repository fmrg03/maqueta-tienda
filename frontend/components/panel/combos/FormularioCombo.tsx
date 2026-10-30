"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api/client";
import { dinero } from "@/lib/panel/carrito";
import { actualizarCombo, crearCombo, totalesItems, type ComboAdmin, type ItemComboAdmin } from "@/lib/panel/combos";
import { aNumero, textoAtributos } from "@/lib/panel/materiales";
import { SelectorPresentacion } from "./SelectorPresentacion";

type Fila = { clave: string; cantidad: string; variante: ItemComboAdmin["variante"] };

export function FormularioCombo({ inicial }: { inicial?: ComboAdmin }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? "");
  const [precio, setPrecio] = useState(inicial ? String(inicial.precioCombo) : "");
  const [activo, setActivo] = useState(inicial?.activo ?? true);
  const [filas, setFilas] = useState<Fila[]>(
    (inicial?.items ?? []).map((i) => ({ clave: i.variante.id, cantidad: String(i.cantidad), variante: i.variante })),
  );
  const [errores, setErrores] = useState<Partial<Record<"nombre" | "precio" | "items" | "general", string>>>({});
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const itemsValidos = filas.map((f) => ({ cantidad: /^\d+$/.test(f.cantidad.trim()) ? Number(f.cantidad) : 0, variante: f.variante }));
  const { referencia, costo } = totalesItems(itemsValidos);
  const precioNum = aNumero(precio);
  const ahorro = precioNum !== null && referencia > 0 ? referencia - precioNum : null;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const nuevos: typeof errores = {};
    if (!nombre.trim()) nuevos.nombre = "Escribe el nombre del combo.";
    if (precioNum === null || precioNum < 0) nuevos.precio = "Escribe el precio del combo (ej. 45.00).";
    if (filas.length === 0) nuevos.items = "Agrega al menos un producto.";
    else if (itemsValidos.some((i) => i.cantidad < 1)) nuevos.items = "Cada producto necesita una cantidad entera de 1 o más.";
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;

    setGuardando(true);
    setGuardado(false);
    const datos = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      precioCombo: precioNum as number,
      items: itemsValidos.map((i) => ({ varianteId: i.variante.id, cantidad: i.cantidad })),
    };
    try {
      if (inicial) {
        await actualizarCombo(inicial.id, { ...datos, activo });
        setGuardado(true);
      } else {
        const c = await crearCombo(datos);
        router.push(`/panel/combos/${c.id}`);
        return;
      }
    } catch (err) {
      console.error(err);
      setErrores({ general: err instanceof ApiError ? err.message : "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex max-w-3xl flex-col gap-5">
      <Input label="Nombre del combo" name="nombre" value={nombre} maxLength={200} onChange={(e) => setNombre(e.target.value)} error={errores.nombre} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="descripcion" className="text-sm font-medium">Descripción (opcional)</label>
        <textarea id="descripcion" rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="rounded-sm border border-piedra-oscura bg-white px-3 py-2.5 text-sm" />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium">Productos del combo</h2>
        {filas.length > 0 && (
          <div className="relative mb-3 overflow-x-auto bg-white">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-piedra-oscura text-left text-xs text-[#8A8272]">
                  <th className="px-3 py-2 font-normal">Producto</th>
                  <th className="px-3 py-2 font-normal">Cantidad</th>
                  <th className="px-3 py-2 text-right font-normal">Precio normal</th>
                  <th className="px-3 py-2"><span className="sr-only">Quitar</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-piedra-oscura">
                {filas.map((f, idx) => (
                  <tr key={f.clave}>
                    <td className="px-3 py-2">
                      <p className="font-medium">{f.variante.material?.nombre ?? f.variante.skuVariante}</p>
                      <p className="font-mono text-xs text-[#8A8272]">{f.variante.skuVariante}{textoAtributos(f.variante.atributos) && ` · ${textoAtributos(f.variante.atributos)}`} · stock {f.variante.stock}</p>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        aria-label={`Cantidad de ${f.variante.skuVariante}`}
                        inputMode="numeric"
                        value={f.cantidad}
                        onChange={(e) => setFilas((fs) => fs.map((x, i) => (i === idx ? { ...x, cantidad: e.target.value } : x)))}
                        className="w-20 rounded-sm border border-piedra-oscura px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{dinero(f.variante.precioVenta * (itemsValidos[idx].cantidad || 0))}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" className="text-xs underline" onClick={() => setFilas((fs) => fs.filter((_, i) => i !== idx))}>Quitar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <SelectorPresentacion
          yaElegidas={new Set(filas.map((f) => f.variante.id))}
          onElegir={(v) => setFilas((fs) => [...fs, { clave: v.id, cantidad: "1", variante: v }])}
        />
        {errores.items && <p role="alert" className="mt-2 text-xs text-vino">{errores.items}</p>}
      </section>

      <div className="max-w-xs">
        <Input label="Precio del combo ($)" name="precio" inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} error={errores.precio} />
      </div>

      {filas.length > 0 && (
        <p className="text-sm text-[#4A4538]" aria-live="polite">
          Por separado costaría <strong>{dinero(referencia)}</strong>.
          {ahorro !== null && ahorro > 0 && <> El cliente ahorra <strong className="text-esmeralda">{dinero(ahorro)} ({Math.round((ahorro / referencia) * 100)}%)</strong>.</>}
          {ahorro !== null && ahorro < 0 && <> El combo sale <strong>más caro</strong> que comprar por separado.</>}
          {precioNum !== null && precioNum < costo && <span className="mt-1 block text-vino">Atención: el precio está por debajo del costo ({dinero(costo)}); vendes a pérdida.</span>}
        </p>
      )}

      {inicial && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="mt-1" />
          <span>Visible en la web<span className="block text-xs text-[#8A8272]">Si lo desmarcas, el combo deja de mostrarse a los clientes.</span></span>
        </label>
      )}

      {errores.general && <p role="alert" className="text-sm text-vino">{errores.general}</p>}
      {guardado && <p role="status" className="text-sm text-esmeralda">Cambios guardados.</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={guardando}>{guardando ? "Guardando…" : inicial ? "Guardar cambios" : "Crear combo"}</Button>
        <Link href="/panel/combos" className="rounded-sm border border-negro px-6 py-3 text-sm font-medium hover:bg-negro hover:text-texto-claro">Volver</Link>
      </div>
    </form>
  );
}
