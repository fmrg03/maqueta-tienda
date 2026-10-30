import { DetalleAsesor } from "@/components/panel/asesores/DetalleAsesor";

// En esta versión de Next, params y searchParams son Promesas.
export default async function PaginaDetalleAsesor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const { id } = await params;
  const { nuevo } = await searchParams;
  return <DetalleAsesor id={id} recienCreado={nuevo === "1"} />;
}
