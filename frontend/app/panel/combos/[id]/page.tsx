import { EditarCombo } from "@/components/panel/combos/EditarCombo";

// En esta versión de Next, params es una Promesa.
export default async function PaginaEditarCombo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditarCombo id={id} />;
}
