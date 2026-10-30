import { DetalleMaterial } from "@/components/panel/materiales/DetalleMaterial";

// En esta versión de Next, params y searchParams son Promesas.
export default async function PaginaDetalleMaterial({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const { id } = await params;
  const { nuevo } = await searchParams;
  return <DetalleMaterial id={id} recienCreado={nuevo === "1"} />;
}
