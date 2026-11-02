"use client";

import { useEffect, useState } from "react";
import { dinero, fechaCorta } from "@/lib/panel/carrito";
import { calcularTotales, importeLinea, numeroPresupuesto, obtenerPresupuesto, type Presupuesto } from "@/lib/panel/presupuestos";

export function VistaImpresion({ id }: { id: string }) {
  const [p, setP] = useState<Presupuesto | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let vigente = true;
    obtenerPresupuesto(id)
      .then((r) => vigente && setP(r))
      .catch(() => vigente && setFallo(true));
    return () => {
      vigente = false;
    };
  }, [id]);

  if (fallo) return <p role="alert" className="text-vino">No pudimos cargar el presupuesto.</p>;
  if (!p) return <p className="text-[#8A8272]">Cargando…</p>;

  const t = calcularTotales(p.items, p.descuentoPct);
  const grupos: Array<[string, typeof p.items]> = [
    ["Materiales y productos", p.items.filter((l) => l.tipo !== "servicio")],
    ["Servicios", p.items.filter((l) => l.tipo === "servicio")],
  ];

  return (
    <article className="mx-auto max-w-3xl bg-white p-8 text-negro print:max-w-none print:p-0">
      <div className="mb-6 flex items-start justify-between print:hidden">
        <p className="text-sm text-[#8A8272]">Vista de impresión</p>
        <button type="button" onClick={() => window.print()} className="rounded-sm bg-negro px-4 py-2 text-sm text-texto-claro">Imprimir</button>
      </div>
      <header className="border-b-2 border-dorado-oscuro pb-4">
        <p className="font-serif text-2xl font-semibold">Revestimiento Élite RY</p>
        <p className="text-sm text-[#4A4538]">Carrera 25 con Calle 20, Barquisimeto, Estado Lara</p>
      </header>
      <h1 className="mt-6 font-serif text-2xl font-semibold">Presupuesto N° {numeroPresupuesto(p.numero)}</h1>
      <p className="text-sm text-[#4A4538]">Fecha: {fechaCorta(p.createdAt)} · Válido por {p.validezDias} días</p>
      <section className="mt-4 text-sm">
        <p><b>Cliente:</b> {p.clienteNombre}</p>
        {p.clienteTelefono && <p><b>Teléfono:</b> {p.clienteTelefono}</p>}
        {p.obra && <p><b>Obra:</b> {p.obra}</p>}
      </section>
      {grupos.map(([titulo, items]) =>
        items.length === 0 ? null : (
          <section key={titulo} className="mt-6">
            <h2 className="mb-2 font-semibold">{titulo}</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-piedra-oscura text-left">
                  <th className="py-1.5 font-medium">Descripción</th>
                  <th className="py-1.5 text-right font-medium">Cant.</th>
                  <th className="py-1.5 text-right font-medium">Precio</th>
                  <th className="py-1.5 text-right font-medium">Importe</th>
                </tr>
              </thead>
              <tbody>
                {items.map((l, i) => (
                  <tr key={i} className="border-b border-piedra-oscura/50">
                    <td className="py-1.5">{l.descripcion}</td>
                    <td className="py-1.5 text-right font-mono">{l.cantidad} {l.unidad}</td>
                    <td className="py-1.5 text-right font-mono">{dinero(l.precioUnitario)}</td>
                    <td className="py-1.5 text-right font-mono">{dinero(importeLinea(l))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ),
      )}
      <dl className="ml-auto mt-6 max-w-xs space-y-1 font-mono text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{dinero(t.subtotal)}</dd></div>
        {t.descuentoMonto > 0 && <div className="flex justify-between"><dt>Descuento ({p.descuentoPct}%)</dt><dd>−{dinero(t.descuentoMonto)}</dd></div>}
        <div className="flex justify-between border-t border-negro pt-1 text-base font-semibold"><dt>Total</dt><dd>{dinero(t.total)}</dd></div>
      </dl>
      {p.notas && <p className="mt-6 whitespace-pre-line text-sm"><b>Notas:</b> {p.notas}</p>}
    </article>
  );
}
