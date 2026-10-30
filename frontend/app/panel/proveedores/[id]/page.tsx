import { DetalleProveedor } from "@/components/panel/proveedores/DetalleProveedor";

// En esta versión de Next, params y searchParams son Promesas.
export default async function PaginaDetalleProveedor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const { id } = await params;
  const { nuevo } = await searchParams;
  return <DetalleProveedor id={id} recienCreado={nuevo === "1"} />;
}
