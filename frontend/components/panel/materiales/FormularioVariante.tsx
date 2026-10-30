"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api/client";
import {
  aNumero,
  margenPct,
  sugerirSkuVariante,
  type DatosVariante,
  type VarianteAdmin,
} from "@/lib/panel/materiales";

interface Fila {
  id: number;
  clave: string;
  valor: string;
}

let contador = 0;
const nuevaFila = (clave = "Presentación", valor = ""): Fila => ({ id: ++contador, clave, valor });

const CLAVES_SUGERIDAS = ["Presentación", "Tamaño", "Color", "Medida", "Acabado", "Peso"];

/** Una presentación de un material: atributos, SKU, precios y (solo al crear) stock inicial. */
export function FormularioVariante({
  skuMaterial,
  inicial,
  onGuardar,
  onCancelar,
}: {
  skuMaterial: string;
  inicial?: VarianteAdmin;
  onGuardar: (datos: DatosVariante, stockInicial?: number) => Promise<void>;
  onCancelar: () => void;
}) {
  const editando = inicial !== undefined;
  const [filas, setFilas] = useState<Fila[]>(() => {
    const e = Object.entries(inicial?.atributos ?? {});
    return e.length > 0 ? e.map(([k, v]) => nuevaFila(k, v)) : [nuevaFila()];
  });
  const [sku, setSku] = useState(inicial?.skuVariante ?? "");
  const [skuTocado, setSkuTocado] = useState(editando);
  const [venta, setVenta] = useState(inicial ? String(inicial.precioVenta) : "");
  const [costo, setCosto] = useState(inicial ? String(inicial.precioCosto) : "");
  const [stock, setStock] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorSku, setErrorSku] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Mientras no escribas el SKU a mano, se sugiere a partir del material y la presentación.
  const skuMostrado = skuTocado ? sku : sugerirSkuVariante(skuMaterial, filas);

  const ventaNum = aNumero(venta);
  const costoNum = aNumero(costo);
  const margen = ventaNum !== null && costoNum !== null ? margenPct(ventaNum, costoNum) : null;

  const cambiarFila = (id: number, campo: "clave" | "valor", v: string) =>
    setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, [campo]: v } : f)));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorSku(null);

    const atributos: Record<string, string> = {};
    for (const f of filas) {
      if (f.clave.trim() && f.valor.trim()) atributos[f.clave.trim()] = f.valor.trim();
    }
    if (Object.keys(atributos).length === 0) return setError("Describe la presentación (por ejemplo Presentación: 25 kg).");
    if (!skuMostrado.trim()) return setErrorSku("Escribe el SKU de esta presentación.");
    if (ventaNum === null || ventaNum < 0) return setError("Escribe el precio de venta.");
    if (costoNum === null || costoNum < 0) return setError("Escribe el costo.");
    const stockNum = stock.trim() === "" ? 0 : Number(stock);
    if (!editando && (!Number.isInteger(stockNum) || stockNum < 0)) return setError("El stock inicial debe ser un número entero (0 o más).");

    setGuardando(true);
    try {
      await onGuardar(
        { skuVariante: skuMostrado.trim(), atributos, precioVenta: Math.round(ventaNum * 100) / 100, precioCosto: Math.round(costoNum * 100) / 100 },
        editando ? undefined : stockNum,
      );
    } catch (err) {
      console.error(err);
      const m = err instanceof ApiError ? err.message : "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.";
      if (err instanceof ApiError && err.statusCode === 409) setErrorSku(m);
      else setError(m);
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4 bg-white p-4">
      <h3 className="font-semibold">{editando ? "Editar presentación" : "Nueva presentación"}</h3>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">¿Cómo se distingue? (lo que el cliente verá al elegir)</legend>
        {filas.map((f, i) => (
          <div key={f.id} className="flex flex-wrap items-center gap-2">
            <input
              aria-label={`Atributo ${i + 1}`}
              list="claves-atributo"
              value={f.clave}
              onChange={(e) => cambiarFila(f.id, "clave", e.target.value)}
              className="w-36 rounded-sm border border-piedra-oscura bg-white px-3 py-2 text-sm"
            />
            <input
              aria-label={`Valor del atributo ${i + 1}`}
              placeholder="25 kg"
              value={f.valor}
              onChange={(e) => cambiarFila(f.id, "valor", e.target.value)}
              className="min-w-0 flex-1 rounded-sm border border-piedra-oscura bg-white px-3 py-2 text-sm"
            />
            {filas.length > 1 && (
              <button type="button" onClick={() => setFilas((fs) => fs.filter((x) => x.id !== f.id))} className="text-sm text-vino underline" aria-label={`Quitar atributo ${i + 1}`}>
                Quitar
              </button>
            )}
          </div>
        ))}
        <datalist id="claves-atributo">
          {CLAVES_SUGERIDAS.map((c) => <option key={c} value={c} />)}
        </datalist>
        <button type="button" onClick={() => setFilas((fs) => [...fs, nuevaFila("Color")])} className="self-start text-sm underline">
          ＋ Agregar otro atributo (color, tamaño…)
        </button>
      </fieldset>

      <Input
        label="SKU de la presentación"
        name="skuVariante"
        value={skuMostrado}
        maxLength={60}
        onChange={(e) => {
          setSku(e.target.value);
          setSkuTocado(true);
        }}
        error={errorSku ?? undefined}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Precio de venta ($)" name="precioVenta" inputMode="decimal" value={venta} onChange={(e) => setVenta(e.target.value)} />
        <Input label="Costo ($)" name="precioCosto" inputMode="decimal" value={costo} onChange={(e) => setCosto(e.target.value)} />
        {!editando && <Input label="Stock inicial" name="stock" inputMode="numeric" placeholder="0" value={stock} onChange={(e) => setStock(e.target.value)} />}
      </div>

      {margen !== null && (
        <p className={`text-sm ${margen < 0 ? "text-vino" : "text-[#4A4538]"}`}>
          Margen: <strong className="font-mono">{margen}%</strong>
          {margen < 0 && " — el precio de venta es menor que el costo."}
        </p>
      )}
      {editando && <p className="text-xs text-[#8A8272]">El stock no se edita aquí: usa Entrada/Salida para que quede en el historial de movimientos.</p>}

      {error && <p role="alert" className="text-sm text-vino">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={guardando}>{guardando ? "Guardando…" : editando ? "Guardar cambios" : "Agregar presentación"}</Button>
        <Button type="button" variante="secundario" onClick={onCancelar} disabled={guardando}>Cancelar</Button>
      </div>
    </form>
  );
}
