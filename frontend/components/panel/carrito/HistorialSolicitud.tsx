import { ETIQUETA_ESTADO, ETIQUETA_EVENTO, ETIQUETA_METODO, dinero, fechaCorta, type Evento, type EstadoCarrito, type MetodoPago } from "@/lib/panel/carrito";

function resumen(e: Evento): string {
  const d = e.detalle ?? {};
  switch (e.tipo) {
    case "estado":
      return `${ETIQUETA_ESTADO[d.de as EstadoCarrito] ?? d.de} → ${ETIQUETA_ESTADO[d.a as EstadoCarrito] ?? d.a}`;
    case "items_editados":
      return Array.isArray(d.despues) ? `${d.despues.length} ítem(s) en el pedido` : "";
    case "detalle_enviado":
      return d.emailEnviado ? "Por correo y WhatsApp" : "Por WhatsApp";
    case "cerrada":
    case "pendiente_stock":
      return `${ETIQUETA_METODO[d.metodoPago as MetodoPago] ?? d.metodoPago ?? ""} · ${d.montoCobrado != null ? dinero(Number(d.montoCobrado)) : ""}`.trim();
    case "cancelada":
    case "anulada":
      return String(d.motivo ?? "");
    default:
      return "";
  }
}

export function HistorialSolicitud({ eventos }: { eventos: Evento[] }) {
  if (eventos.length === 0) return null;
  return (
    <section className="mt-10" aria-labelledby="hist">
      <h2 id="hist" className="mb-3 font-serif text-lg font-semibold">Historial</h2>
      <ol className="space-y-2 border-l border-piedra-oscura pl-4 text-sm">
        {eventos.map((e) => (
          <li key={e.id}>
            <span className="font-medium">{ETIQUETA_EVENTO[e.tipo] ?? e.tipo}</span>
            {resumen(e) && <span className="text-[#4A4538]"> — {resumen(e)}</span>}
            <p className="font-mono text-xs text-[#8A8272]">
              {fechaCorta(e.createdAt)}
              {e.usuario?.nombre ? ` · ${e.usuario.nombre}` : ""}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
