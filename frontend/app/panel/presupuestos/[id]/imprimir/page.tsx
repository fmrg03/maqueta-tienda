import { VistaImpresion } from "@/components/panel/presupuestos/VistaImpresion";

export default async function PaginaImprimir({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VistaImpresion id={id} />;
}
