"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api/client";
import { listarCategorias, type Categoria } from "@/lib/catalogo/catalogo";
import { crearCategoria, type DatosMaterial, type MaterialAdmin } from "@/lib/panel/materiales";

const NUEVA = "__nueva__";

/**
 * Datos del material (sin presentaciones). Sirve para el paso 1 del alta y para
 * editar uno existente. `onGuardar` hace la llamada y devuelve el material.
 */
export function FormularioMaterial({
  inicial,
  textoBoton,
  onGuardar,
  onCancelar,
}: {
  inicial?: MaterialAdmin;
  textoBoton: string;
  onGuardar: (datos: DatosMaterial) => Promise<void>;
  onCancelar?: () => void;
}) {
  const [sku, setSku] = useState(inicial?.sku ?? "");
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [categoria, setCategoria] = useState(inicial?.categoria?.id ?? "");
  const [categoriaNueva, setCategoriaNueva] = useState("");
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? "");
  const [imagenUrl, setImagenUrl] = useState(inicial?.imagenUrl ?? "");
  const [activo, setActivo] = useState(inicial?.activo ?? true);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [errores, setErrores] = useState<Partial<Record<"sku" | "nombre" | "categoria" | "imagen" | "general", string>>>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    listarCategorias().then((c) => vigente && setCategorias(c)).catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const nuevos: typeof errores = {};
    if (!sku.trim()) nuevos.sku = "Escribe el SKU del material.";
    if (!nombre.trim()) nuevos.nombre = "Escribe el nombre.";
    if (categoria === NUEVA && categoriaNueva.trim().length < 2) nuevos.categoria = "Escribe el nombre de la categoría nueva.";
    if (imagenUrl.trim() && !/^https?:\/\//i.test(imagenUrl.trim())) nuevos.imagen = "La imagen debe ser un enlace que empiece con http:// o https://";
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setGuardando(true);
    try {
      let categoriaId = categoria && categoria !== NUEVA ? categoria : undefined;
      if (categoria === NUEVA) categoriaId = (await crearCategoria(categoriaNueva.trim())).id;

      await onGuardar({
        sku: sku.trim(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        categoriaId,
        imagenUrl: imagenUrl.trim() || undefined,
        activo,
      });
    } catch (err) {
      console.error(err);
      const m = err instanceof ApiError ? err.message : "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.";
      if (err instanceof ApiError && err.statusCode === 409 && /SKU/i.test(m)) setErrores({ sku: m });
      else if (err instanceof ApiError && err.statusCode === 409) setErrores({ categoria: m });
      else setErrores({ general: m });
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex max-w-xl flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        <Input label="SKU" name="sku" value={sku} maxLength={50} onChange={(e) => setSku(e.target.value)} error={errores.sku} />
        <Input label="Nombre" name="nombre" value={nombre} maxLength={200} onChange={(e) => setNombre(e.target.value)} error={errores.nombre} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="categoria" className="text-sm font-medium">Categoría</label>
        <select
          id="categoria"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="rounded-sm border border-piedra-oscura bg-white px-3 py-2.5 text-sm"
        >
          <option value="">Sin categoría</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
          <option value={NUEVA}>＋ Crear categoría nueva…</option>
        </select>
        {errores.categoria && <span className="text-xs text-vino">{errores.categoria}</span>}
      </div>
      {categoria === NUEVA && (
        <Input label="Nombre de la categoría nueva" name="categoriaNueva" value={categoriaNueva} maxLength={100} onChange={(e) => setCategoriaNueva(e.target.value)} />
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="descripcion" className="text-sm font-medium">Descripción (opcional)</label>
        <textarea
          id="descripcion"
          rows={3}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="rounded-sm border border-piedra-oscura bg-white px-3 py-2.5 text-sm"
        />
      </div>

      <Input
        label="Imagen (enlace, opcional)"
        name="imagenUrl"
        type="url"
        placeholder="https://…"
        value={imagenUrl}
        maxLength={500}
        onChange={(e) => setImagenUrl(e.target.value)}
        error={errores.imagen}
      />

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="mt-1" />
        <span>
          Visible en el catálogo
          <span className="block text-xs text-[#8A8272]">Si lo desmarcas, el material deja de mostrarse a los clientes pero conserva su historial.</span>
        </span>
      </label>

      {errores.general && <p role="alert" className="text-sm text-vino">{errores.general}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={guardando}>{guardando ? "Guardando…" : textoBoton}</Button>
        {onCancelar && (
          <Button type="button" variante="secundario" onClick={onCancelar} disabled={guardando}>Cancelar</Button>
        )}
      </div>
    </form>
  );
}
