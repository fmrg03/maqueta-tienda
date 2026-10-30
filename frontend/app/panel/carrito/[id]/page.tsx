import { DetalleSolicitud } from "@/components/panel/carrito/DetalleSolicitud";

// En esta versión de Next, params es una Promesa.
export default async function PaginaDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetalleSolicitud id={id} />;
}
