import { PublicShell, TituloPagina } from "@/components/layout/PublicShell";
import { ConsultaCliente } from "@/components/carrito/ConsultaCliente";

export const metadata = { title: "Mi consulta — Revestimiento Élite RY" };

export default function ConsultaPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-4xl px-6 py-12">
        <TituloPagina descripcion="No es una compra: nuestro equipo de ventas te contacta por WhatsApp para confirmar presentaciones, disponibilidad, forma de pago y entrega.">
          Mi consulta
        </TituloPagina>
        {/* Panel claro: los formularios se leen mejor sobre piedra que sobre negro. */}
        <div className="bg-piedra p-6 text-negro md:p-8">
          <ConsultaCliente />
        </div>
      </div>
    </PublicShell>
  );
}
