"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { listarCategorias, type Categoria } from "@/lib/catalogo/catalogo";
import { listarProveedores, type ProveedorAdmin } from "@/lib/panel/proveedores";
import {
  descargarPlantilla,
  importarFilas,
  leerExcel,
  validarFilas,
  type FilaImportacion,
  type FilaValidada,
} from "@/lib/panel/importacion";

interface Fila {
  clave: number;
  sku: string;
  nombre: string;
  categoria: string;
  skuVariante: string;
  presentacion: string;
  precioVenta: string;
  precioDivisas: string;
  precioCosto: string;
  stock: string;
  entrega: string;
  errores: string[];
}

let contador = 0;
const vacia = (): Fila => ({ clave: ++contador, sku: "", nombre: "", categoria: "", skuVariante: "", presentacion: "", precioVenta: "", precioDivisas: "", precioCosto: "", stock: "", entrega: "", errores: [] });

const aTexto = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
const desdeValidada = (f: FilaValidada): Fila => ({
  clave: ++contador,
  sku: f.sku ?? "",
  nombre: f.nombre ?? "",
  categoria: f.categoria ?? "",
  skuVariante: f.skuVariante ?? "",
  presentacion: f.presentacion ?? "",
  precioVenta: aTexto(f.precioVenta),
  precioDivisas: aTexto(f.precioDivisas),
  precioCosto: aTexto(f.precioCosto),
  stock: aTexto(f.stock),
  entrega: aTexto(f.tiempoEntregaDias),
  errores: f.errores ?? [],
});

const num = (t: string): number | undefined => {
  if (t.trim() === "") return undefined;
  const n = Number(t.trim().replace(",", "."));
  return Number.isNaN(n) ? NaN : n;
};

function aPayload(f: Fila): FilaImportacion {
  return {
    sku: f.sku.trim(),
    nombre: f.nombre.trim(),
    categoria: f.categoria.trim() || undefined,
    skuVariante: f.skuVariante.trim() || undefined,
    presentacion: f.presentacion.trim() || undefined,
    precioVenta: num(f.precioVenta) as number,
    precioCosto: num(f.precioCosto) as number,
    precioDivisas: num(f.precioDivisas),
    stock: num(f.stock),
    tiempoEntregaDias: num(f.entrega),
  };
}

const msg = (e: unknown) => (e instanceof ApiError ? e.message : "No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.");
const celda = "w-full min-w-0 rounded-sm border border-piedra-oscura bg-white px-2 py-1.5 text-sm";

/** Carga masiva: se elige el proveedor arriba y se llenan filas a mano o desde la plantilla de Excel. */
export function ImportarProductos() {
  const [proveedores, setProveedores] = useState<ProveedorAdmin[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedorId, setProveedorId] = useState("");
  const [filas, setFilas] = useState<Fila[]>(() => [vacia(), vacia(), vacia()]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listarProveedores("activos").then(setProveedores).catch(() => undefined);
    listarCategorias().then(setCategorias).catch(() => undefined);
  }, []);

  const cambiar = (clave: number, campo: keyof Fila, v: string) =>
    setFilas((fs) => fs.map((f) => (f.clave === clave ? { ...f, [campo]: v, errores: [] } : f)));
  const llenas = filas.filter((f) => [f.sku, f.nombre, f.precioVenta, f.precioCosto].some((x) => x.trim() !== ""));

  function aplicar(validadas: FilaValidada[]) {
    const nuevas = validadas.map(desdeValidada);
    setFilas(nuevas.length ? nuevas : [vacia()]);
  }

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

  function revisar() {
    if (llenas.length === 0) return setError("Agrega al menos un producto.");
    void ejecutar("validar", async () => {
      const r = await validarFilas(llenas.map(aPayload), proveedorId || undefined);
      const porClave = new Map(llenas.map((f, i) => [f.clave, r.filas[i]?.errores ?? []]));
      setFilas((fs) => fs.map((f) => (porClave.has(f.clave) ? { ...f, errores: porClave.get(f.clave) ?? [] } : f)));
      if (r.errorGlobal.length) setError(r.errorGlobal.join(" "));
      else if (r.conErrores > 0) setError(`${r.conErrores} fila(s) con errores: corrígelas (se marcan en rojo).`);
      else setAviso(`Todo en orden: ${r.validas} presentación(es) listas para importar.`);
    });
  }

  function importar() {
    if (llenas.length === 0) return setError("Agrega al menos un producto.");
    void ejecutar("importar", async () => {
      try {
        const r = await importarFilas(llenas.map(aPayload), proveedorId || undefined);
        setAviso(`Importado: ${r.productosNuevos} producto(s) nuevo(s) y ${r.presentaciones} presentación(es)${proveedorId ? " asociadas al proveedor" : ""}.`);
        setFilas([vacia(), vacia(), vacia()]);
      } catch (e) {
        const filasErr = (e instanceof ApiError ? (e.detalle as { filas?: FilaValidada[] })?.filas : undefined) ?? [];
        if (filasErr.length) {
          const porFila = new Map(filasErr.map((f) => [f.fila, f.errores]));
          setFilas((fs) => fs.map((f) => ({ ...f, errores: porFila.get(llenas.findIndex((l) => l.clave === f.clave) + 1) ?? f.errores })));
        }
        throw e;
      }
    });
  }

  function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    void ejecutar("excel", async () => {
      const r = await leerExcel(f, proveedorId || undefined);
      aplicar(r.filas);
      if (r.errorGlobal.length) setError(r.errorGlobal.join(" "));
      else if (r.conErrores > 0) setError(`Se leyeron ${r.total} filas; ${r.conErrores} tienen errores (en rojo). Corrígelas aquí mismo.`);
      else setAviso(`Se leyeron ${r.total} filas sin errores. Revisa y pulsa «Importar».`);
    });
  }

  return (
    <div className="max-w-full">
      <Link href="/panel/materiales" className="text-sm underline">← Materiales</Link>
      <h1 className="mt-3 font-serif text-[26px] font-semibold">Carga masiva de productos</h1>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <p className="mb-6 max-w-3xl text-[#8A8272]">
        Elige el proveedor y agrega todos sus productos de una vez: escríbelos en la tabla o descarga la plantilla de Excel, llénala y súbela. Cada fila es una presentación; repite el SKU del producto para varias presentaciones.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-4 bg-white p-4">
        <div className="flex min-w-[16rem] flex-col gap-1.5">
          <label htmlFor="prov" className="text-sm font-medium">Proveedor de estos productos</label>
          <select id="prov" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className="rounded-sm border border-piedra-oscura bg-white px-3 py-2.5 text-sm">
            <option value="">Sin proveedor</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <Button type="button" variante="secundario" disabled={ocupado !== null} onClick={() => ejecutar("plantilla", descargarPlantilla)}>Descargar plantilla Excel</Button>
        <Button type="button" variante="secundario" disabled={ocupado !== null} onClick={() => archivo.current?.click()}>
          {ocupado === "excel" ? "Leyendo…" : "Subir Excel llenado"}
        </Button>
        <input ref={archivo} type="file" accept=".xlsx" className="hidden" onChange={alElegirArchivo} aria-label="Archivo Excel de productos" />
      </div>

      {error && <p role="alert" className="mb-3 text-sm text-vino">{error}</p>}
      {aviso && <p role="status" className="mb-3 border-l-4 border-esmeralda bg-white px-3 py-2 text-sm">{aviso}</p>}

      <div className="overflow-x-auto bg-white">
        <table className="w-full min-w-[70rem] text-left text-sm">
          <thead className="border-b border-piedra-oscura text-xs text-[#8A8272]">
            <tr>
              {["SKU producto", "Nombre", "Categoría", "SKU presentación", "Presentación", "Precio venta", "Precio divisas", "Costo", "Stock", "Entrega (días)", ""].map((h) => (
                <th key={h} className="px-2 py-2 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={f.clave} className={f.errores.length ? "bg-vino/5 align-top" : "align-top"}>
                {([
                  ["sku", "SKU producto", "w-28"],
                  ["nombre", "Nombre", "w-48"],
                ] as const).map(([campo, et, ancho]) => (
                  <td key={campo} className={`px-1 py-1 ${ancho}`}><input aria-label={`${et} fila ${i + 1}`} className={celda} value={f[campo]} onChange={(e) => cambiar(f.clave, campo, e.target.value)} /></td>
                ))}
                <td className="px-1 py-1">
                  <select aria-label={`Categoría fila ${i + 1}`} className={celda} value={f.categoria} onChange={(e) => cambiar(f.clave, "categoria", e.target.value)}>
                    <option value="">—</option>
                    {categorias.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                    {f.categoria && !categorias.some((c) => c.nombre === f.categoria) && <option value={f.categoria}>{f.categoria}</option>}
                  </select>
                </td>
                {([
                  ["skuVariante", "SKU presentación", "w-32"],
                  ["presentacion", "Presentación", "w-36"],
                  ["precioVenta", "Precio venta", "w-24"],
                  ["precioDivisas", "Precio divisas", "w-24"],
                  ["precioCosto", "Costo", "w-24"],
                  ["stock", "Stock", "w-20"],
                  ["entrega", "Entrega", "w-20"],
                ] as const).map(([campo, et, ancho]) => (
                  <td key={campo} className={`px-1 py-1 ${ancho}`}><input aria-label={`${et} fila ${i + 1}`} className={celda} value={f[campo]} inputMode={["precioVenta", "precioDivisas", "precioCosto", "stock", "entrega"].includes(campo) ? "decimal" : undefined} onChange={(e) => cambiar(f.clave, campo, e.target.value)} /></td>
                ))}
                <td className="px-1 py-1">
                  <button type="button" aria-label={`Quitar fila ${i + 1}`} className="px-2 text-vino" onClick={() => setFilas((fs) => (fs.length > 1 ? fs.filter((x) => x.clave !== f.clave) : [vacia()]))}>✕</button>
                </td>
              </tr>
            ))}
            {filas.some((f) => f.errores.length > 0) && (
              <tr>
                <td colSpan={11} className="px-3 py-3 text-sm text-vino">
                  <ul className="list-disc pl-5">
                    {filas.flatMap((f, i) => f.errores.map((e, j) => <li key={`${f.clave}-${j}`}>Fila {i + 1}: {e}</li>))}
                  </ul>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" variante="secundario" onClick={() => setFilas((fs) => [...fs, vacia(), vacia(), vacia()])}>Agregar 3 filas</Button>
        <Button type="button" variante="secundario" onClick={revisar} disabled={ocupado !== null}>{ocupado === "validar" ? "Revisando…" : "Revisar"}</Button>
        <Button type="button" onClick={importar} disabled={ocupado !== null || llenas.length === 0}>{ocupado === "importar" ? "Importando…" : `Importar ${llenas.length || ""} fila(s)`}</Button>
        <span className="text-xs text-[#8A8272]">Todo o nada: si una fila falla no se guarda ninguna.</span>
      </div>
    </div>
  );
}
