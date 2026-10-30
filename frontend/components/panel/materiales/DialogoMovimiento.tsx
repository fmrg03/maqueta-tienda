"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/panel/carrito/Dialogos";
import { ApiError } from "@/lib/api/client";
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
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const n = /^\d+$/.test(cantidad.trim()) ? Number(cantidad) : null;
  const resultante = n !== null ? variante.stock + (tipo === "entrada" ? n : -n) : null;

  async function confirmar() {
    if (n === null || n < 1) return setError("La cantidad debe ser un número entero de 1 o más.");
    if (resultante !== null && resultante < 0) return setError(`Stock insuficiente: hay ${variante.stock}.`);
    setEnviando(true);
    setError(null);
    try {
      await registrarMovimiento(materialId, { varianteId: variante.id, tipo, cantidad: n, motivo: motivo.trim() || undefined });
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
