import Link from "next/link";
import { FormularioUsuario } from "@/components/panel/usuarios/FormularioUsuario";

export default function PaginaNuevoUsuario() {
  return (
    <div>
      <Link href="/panel/usuarios" className="text-sm underline">← Usuarios</Link>
      <h1 className="mt-3 font-serif text-[26px] font-semibold">Nuevo usuario</h1>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <FormularioUsuario />
    </div>
  );
}
