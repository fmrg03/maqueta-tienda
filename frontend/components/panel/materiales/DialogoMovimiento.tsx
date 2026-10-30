"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/panel/carrito/Dialogos";
import { ApiError } from "@/lib/api/client";
import { listarProductosProveedor, listarProveedores, type ProveedorAdmin } from "@/lib/panel/proveedores";
import { registrarMovimiento, textoAtributos, type VarianteAdmin } from "@/lib/panel/materiales";

export function DialogoMovimiento({
  materialId,
  nombreMaterial,
  variante,
  tipoInicial,
  onCerrar,
  onRegistrado,
}: {
  materialId: string;
  nombreMaterial: string;
  variante: VarianteAdmin;
  tipoInicial: "entrada" | "salida";
  onCerrar: () => void;
  onRegistrado: () => void;
}) {
  const [tipo, setTipo] = useState(tipoInicial);
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [proveedores, setProveedores] = useState<ProveedorAdmin[]>([]);
  const [proveedorId, setProveedorId] = useState("");
  const [costo, setCosto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vigente = true;
    listarProveedores("activos")
      .then((l) => vigente && setProveedores(l))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  // Al elegir proveedor, sugiere el costo que ya tiene registrado para esta presentación.
  function elegirProveedor(id: string) {
    setProveedorId(id);
    if (!id) return;
    listarProductosProveedor(id)
      .then((l) => {
        const p = l.find((x) => x.variante.id === variante.id);
        if (p) setCosto(String(p.precioCostoProveedor));
      })
      .catch(() => undefined);
  }

  const n = /^\d+$/.test(cantidad.trim()) ? Number(cantidad) : null;
  const resultante = n !== null ? variante.stock + (tipo === "entrada" ? n : -n) : null;

  async function confirmar() {
    if (n === null || n < 1) return setError("La cantidad debe ser un número entero de 1 o más.");
    if (resultante !== null && resultante < 0) return setError(`Stock insuficiente: hay ${variante.stock}.`);
    setEnviando(true);
    setError(null);
    try {
      const c = costo.trim() === "" ? undefined : Number(costo);
      if (tipo === "entrada" && c !== undefined && !(c >= 0)) {
        setEnviando(false);
        return setError("El costo pagado debe ser un número de 0 o más.");
      }
      await registrarMovimiento(materialId, {
        varianteId: variante.id,
        tipo,
        cantidad: n,
        motivo: motivo.trim() || undefined,
        ...(tipo === "entrada" ? { proveedorId: proveedorId || undefined, costoUnitario: c } : {}),
      });
      onRegistrado();
    } catch (e) {
      console.error(e);
      setError(e instanceof ApiError ? e.message : "No pudimos registrar el movimiento. Inténtalo de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Movimiento de inventario" onCerrar={onCerrar}>
      <p className="mb-4 text-sm text-[#4A4538]">
        {nombreMaterial} — {textoAtributos(variante.atributos) || variante.skuVariante}
        <span className="block font-mono text-xs text-[#8A8272]">{variante.skuVariante} · stock actual {variante.stock}</span>
      </p>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tipo-mov" className="text-sm font-medium">Tipo</label>
          <select id="tipo-mov" value={tipo} onChange={(e) => setTipo(e.target.value as "entrada" | "salida")} className="rounded-sm border border-piedra-oscura bg-white px-3 py-2.5 text-sm">
            <option value="entrada">Entrada (llegó mercancía)</option>
            <option value="salida">Salida (merma, ajuste, uso interno)</option>
          </select>
        </div>
        <Input label="Cantidad" name="cantidad" inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        {tipo === "entrada" && (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="prov-mov" className="text-sm font-medium">Proveedor (opcional)</label>
              <select id="prov-mov" value={proveedorId} onChange={(e) => elegirProveedor(e.target.value)} className="rounded-sm border border-piedra-oscura bg-white px-3 py-2.5 text-sm">
                <option value="">Sin indicar</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <Input label="Costo pagado por unidad, en USD (opcional)" name="costo" inputMode="decimal" value={costo} onChange={(e) => setCosto(e.target.value)} />
            <p className="-mt-2 text-xs text-[#8A8272]">Sirve para el reporte de compras a proveedores. No cambia el costo del producto en el inventario.</p>
          </>
        )}
        <Input label="Motivo (opcional)" name="motivo" value={motivo} maxLength={300} placeholder={tipo === "entrada" ? "Compra a proveedor…" : "Producto dañado…"} onChange={(e) => setMotivo(e.target.value)} />
        {resultante !== null && (
          <p className="font-mono text-sm">
            Stock: {variante.stock} → <strong className={resultante < 0 ? "text-vino" : ""}>{resultante}</strong>
          </p>
        )}
        <p className="text-xs text-[#8A8272]">Las ventas del carrito descuentan stock solas al cerrarse; esto es para entradas y ajustes manuales.</p>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-vino">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <Button variante="secundario" onClick={onCerrar} disabled={enviando}>Volver</Button>
        <Button onClick={confirmar} disabled={enviando}>{enviando ? "Registrando…" : "Registrar"}</Button>
      </div>
    </Modal>
  );
}
