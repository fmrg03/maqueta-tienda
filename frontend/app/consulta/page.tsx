import { PublicHeader } from "@/components/layout/PublicHeader";
import { ConsultaCliente } from "@/components/carrito/ConsultaCliente";

export const metadata = { title: "Mi consulta — Revestimiento Élite RY" };

export default function ConsultaPage() {
  return (
    <main className="min-h-screen bg-piedra text-negro">
      <PublicHeader variante="claro" />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="font-serif text-[26px] font-semibold">Mi consulta</h1>
        <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
        <p className="mb-8 text-[#8A8272]">
          No es una compra: nuestro equipo de ventas te contacta por WhatsApp para
          confirmar presentaciones, disponibilidad, forma de pago y entrega.
        </p>
        <ConsultaCliente />
      </div>
    </main>
  );
}
