import Link from "next/link";
import { FormularioAsesor } from "@/components/panel/asesores/FormularioAsesor";

export default function PaginaNuevoAsesor() {
  return (
    <div>
      <Link href="/panel/asesores" className="text-sm underline">← Asesores</Link>
      <h1 className="mt-3 font-serif text-[26px] font-semibold">Nuevo asesor</h1>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <FormularioAsesor />
    </div>
  );
}
