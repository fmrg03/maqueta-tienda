"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/panel/carrito/Dialogos";
import { listarServicios, UNIDADES_SUGERIDAS, type Servicio } from "@/lib/panel/presupuestos";

export interface DatosLineaServicio {
  servicioId?: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
}

const num = (t: string) => Number(t.replace(",", "."));

/** Agrega un servicio: uno de la lista guardada (con su precio base editable) o uno escrito al momento. */
export function DialogoServicio({ onAgregar, onCerrar }: { onAgregar: (d: DatosLineaServicio) => void; onCerrar: () => void }) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [servicioId, setServicioId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [unidad, setUnidad] = useState("m²");
  const [cantidad, setCantidad] = useState("1");
  const [precio, setPrecio] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    listarServicios("activos")
      .then((s) => vigente && setServicios(s))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  function elegir(id: string) {
    setServicioId(id);
    const s = servicios.find((x) => x.id === id);
    if (s) {
      setDescripcion(s.nombre);
      setUnidad(s.unidad);
      setPrecio(String(s.precioBase));
    }
  }

  function agregar() {
    const c = num(cantidad);
    const p = num(precio);
    if (descripcion.trim() === "") return setError("Escribe qué servicio es.");
    if (!(c > 0)) return setError("La cantidad debe ser mayor que 0.");
    if (precio.trim() === "" || Number.isNaN(p) || p < 0) return setError("Escribe el precio por unidad (puede ser 0).");
    onAgregar({ servicioId: servicioId || undefined, descripcion: descripcion.trim(), unidad: unidad.trim() || "unidad", cantidad: c, precioUnitario: p });
  }

  return (
    <Modal titulo="Agregar servicio" onCerrar={onCerrar}>
      <div className="flex flex-col gap-4">
        {servicios.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="servicio-guardado" className="text-sm font-medium">Servicio de la lista</label>
            <select id="servicio-guardado" value={servicioId} onChange={(e) => elegir(e.target.value)} className="rounded-sm border border-piedra-oscura bg-white px-3 py-2.5 text-sm">
              <option value="">Otro servicio (escribirlo)</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre} — ${s.precioBase.toFixed(2)} por {s.unidad}</option>
              ))}
            </select>
          </div>
        )}
        <Input label="Descripción" name="desc-servicio" value={descripcion} maxLength={300} placeholder="Demolición de piso, pegado de cerámica…" onChange={(e) => setDescripcion(e.target.value)} />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Unidad" name="unidad-servicio" list="unidades-sugeridas" value={unidad} maxLength={30} onChange={(e) => setUnidad(e.target.value)} />
          <Input label="Cantidad" name="cant-servicio" inputMode="decimal" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          <Input label="Precio (USD)" name="precio-servicio" inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} />
        </div>
        <datalist id="unidades-sugeridas">
          {UNIDADES_SUGERIDAS.map((u) => <option key={u} value={u} />)}
        </datalist>
        {error && <p role="alert" className="text-sm text-vino">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variante="secundario" onClick={onCerrar}>Cancelar</Button>
          <Button type="button" onClick={agregar}>Agregar al presupuesto</Button>
        </div>
      </div>
    </Modal>
  );
}
