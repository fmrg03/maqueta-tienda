import Link from "next/link";
import { FormularioCombo } from "@/components/panel/combos/FormularioCombo";

export default function PaginaNuevoCombo() {
  return (
    <div>
      <Link href="/panel/combos" className="text-sm underline">← Combos</Link>
      <h1 className="mt-3 font-serif text-[26px] font-semibold">Nuevo combo</h1>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <FormularioCombo />
    </div>
  );
}
