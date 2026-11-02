"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api/client";
import { dinero } from "@/lib/panel/carrito";
import { actualizarServicio, crearServicio, listarServicios, UNIDADES_SUGERIDAS, type Servicio } from "@/lib/panel/presupuestos";

interface Form {
  id: string | null;
  nombre: string;
  descripcion: string;
  unidad: string;
  precio: string;
}
const vacio: Form = { id: null, nombre: "", descripcion: "", unidad: "m²", precio: "" };

export function ServiciosPanel() {
  const [lista, setLista] = useState<Servicio[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vigente = true;
    listarServicios("todos")
      .then((l) => vigente && setLista(l))
      .catch(() => vigente && setFallo(true));
    return () => {
      vigente = false;
    };
  }, [recarga]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const precio = Number(form.precio.replace(",", "."));
    if (form.nombre.trim().length < 2) return setError("Escribe el nombre del servicio.");
    if (form.unidad.trim() === "") return setError("Indica la unidad (m², hora, global…).");
    if (form.precio.trim() === "" || Number.isNaN(precio) || precio < 0) return setError("Escribe un precio válido.");
    setOcupado(true);
    setError(null);
    try {
      const datos = { nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || undefined, unidad: form.unidad.trim(), precioBase: precio };
      if (form.id) await actualizarServicio(form.id, { ...datos, descripcion: form.descripcion.trim() });
      else await crearServicio(datos);
      setForm(null);
      setRecarga((n) => n + 1);
    } catch (err) {
      console.error(err);
      setError(err instanceof ApiError ? err.message : "No pudimos guardar el servicio. Inténtalo de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  async function alternar(s: Servicio) {
    setError(null);
    try {
      await actualizarServicio(s.id, { activo: !s.activo });
      setRecarga((n) => n + 1);
    } catch (err) {
      console.error(err);
      setError(err instanceof ApiError ? err.message : "No pudimos cambiar el estado del servicio.");
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-serif text-[26px] font-semibold">Servicios</h1>
        {!form && <Button type="button" onClick={() => { setError(null); setForm(vacio); }}>Nuevo servicio</Button>}
      </div>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <p className="mb-6 text-[#8A8272]">Trabajos con precio base que se pueden agregar a un presupuesto. En cada presupuesto el precio se puede ajustar.</p>

      {error && <p role="alert" className="mb-4 text-vino">{error}</p>}

      {form && (
        <form onSubmit={guardar} className="mb-6 grid gap-4 bg-white p-5 sm:grid-cols-2" aria-label={form.id ? "Editar servicio" : "Nuevo servicio"}>
          <Input label="Nombre" name="nombre" value={form.nombre} maxLength={150} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <Input label="Unidad" name="unidad" list="unidades-sugeridas" value={form.unidad} maxLength={30} onChange={(e) => setForm({ ...form, unidad: e.target.value })} />
          <Input label="Precio base (USD)" name="precio" inputMode="decimal" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
          <Input label="Descripción (opcional)" name="descripcion" value={form.descripcion} maxLength={300} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          <datalist id="unidades-sugeridas">{UNIDADES_SUGERIDAS.map((u) => <option key={u} value={u} />)}</datalist>
          <div className="flex gap-3 sm:col-span-2">
            <Button type="submit" disabled={ocupado}>{ocupado ? "Guardando…" : "Guardar servicio"}</Button>
            <Button type="button" variante="secundario" onClick={() => setForm(null)}>Cancelar</Button>
          </div>
        </form>
      )}

      {fallo && <p role="alert" className="text-vino">No pudimos cargar los servicios.</p>}
      {!lista && !fallo && <p className="text-[#8A8272]">Cargando…</p>}
      {lista && lista.length === 0 && <p className="bg-white p-6 text-[#8A8272]">Aún no hay servicios. Crea el primero, por ejemplo «Demolición de piso».</p>}
      {lista && lista.length > 0 && (
        <ul className="divide-y divide-piedra-oscura bg-white">
          {lista.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{s.nombre} {!s.activo && <Badge tono="neutro">Inactivo</Badge>}</p>
                {s.descripcion && <p className="text-xs text-[#8A8272]">{s.descripcion}</p>}
              </div>
              <p className="font-mono text-sm">{dinero(s.precioBase)} / {s.unidad}</p>
              <div className="flex gap-3 text-sm">
                <button type="button" className="underline" onClick={() => { setError(null); setForm({ id: s.id, nombre: s.nombre, descripcion: s.descripcion ?? "", unidad: s.unidad, precio: String(s.precioBase) }); }} aria-label={`Editar ${s.nombre}`}>Editar</button>
                <button type="button" className="underline" onClick={() => alternar(s)} aria-label={`${s.activo ? "Desactivar" : "Activar"} ${s.nombre}`}>{s.activo ? "Desactivar" : "Activar"}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
