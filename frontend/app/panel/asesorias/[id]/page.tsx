import { DetalleAsesoria } from "@/components/panel/asesorias/DetalleAsesoria";

// En esta versión de Next, params es una Promesa.
export default async function PaginaDetalleAsesoria({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetalleAsesoria id={id} />;
}
