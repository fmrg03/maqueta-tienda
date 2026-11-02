import { EditorPresupuesto } from "@/components/panel/presupuestos/EditorPresupuesto";

// En esta versión de Next, params es una Promesa.
export default async function PaginaPresupuesto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditorPresupuesto id={id} />;
}
