"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api/client";
import { actualizarProveedor, crearProveedor, type ProveedorAdmin } from "@/lib/panel/proveedores";

export function FormularioProveedor({ inicial, onGuardado }: { inicial?: ProveedorAdmin; onGuardado?: (p: ProveedorAdmin) => void }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [contacto, setContacto] = useState(inicial?.contacto ?? "");
  const [pago, setPago] = useState(inicial?.condicionesPago ?? "");
  const [errores, setErrores] = useState<{ nombre?: string; general?: string }>({});
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setOk(false);
    if (nombre.trim().length < 2) return setErrores({ nombre: "Escribe el nombre del proveedor." });
    setErrores({});
    setGuardando(true);
    try {
      const datos = { nombre: nombre.trim(), contacto: contacto.trim(), condicionesPago: pago.trim() };
      if (inicial) {
        const p = await actualizarProveedor(inicial.id, datos);
        setOk(true);
        onGuardado?.(p);
      } else {
        const p = await crearProveedor({ ...datos, contacto: datos.contacto || undefined, condicionesPago: datos.condicionesPago || undefined });
        router.push(`/panel/proveedores/${p.id}?nuevo=1`);
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
    <form onSubmit={enviar} noValidate className="flex max-w-md flex-col gap-4">
      <Input label="Nombre del proveedor" name="nombre" value={nombre} maxLength={150} onChange={(e) => setNombre(e.target.value)} error={errores.nombre} />
      <Input label="Contacto (persona y teléfono)" name="contacto" value={contacto} maxLength={200} placeholder="Ej. Pedro Pérez · 0414 1234567" onChange={(e) => setContacto(e.target.value)} />
      <Input label="Condiciones de pago" name="pago" value={pago} maxLength={200} placeholder="Ej. 30 días, contado, 50% adelanto" onChange={(e) => setPago(e.target.value)} />
      {errores.general && <p role="alert" className="text-sm text-vino">{errores.general}</p>}
      {ok && <p role="status" className="text-sm text-esmeralda">Cambios guardados.</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={guardando}>{guardando ? "Guardando…" : inicial ? "Guardar cambios" : "Crear proveedor"}</Button>
        {!inicial && <Link href="/panel/proveedores" className="rounded-sm border border-negro px-6 py-3 text-sm font-medium hover:bg-negro hover:text-texto-claro">Cancelar</Link>}
      </div>
    </form>
  );
}
