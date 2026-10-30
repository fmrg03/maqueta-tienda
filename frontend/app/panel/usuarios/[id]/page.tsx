import { DetalleUsuario } from "@/components/panel/usuarios/DetalleUsuario";

// En esta versión de Next, params y searchParams son Promesas.
export default async function PaginaDetalleUsuario({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const { id } = await params;
  const { nuevo } = await searchParams;
  return <DetalleUsuario id={id} recienCreado={nuevo === "1"} />;
}
