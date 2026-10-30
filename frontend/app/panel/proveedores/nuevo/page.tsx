import Link from "next/link";
import { FormularioProveedor } from "@/components/panel/proveedores/FormularioProveedor";

export default function PaginaNuevoProveedor() {
  return (
    <div>
      <Link href="/panel/proveedores" className="text-sm underline">← Proveedores</Link>
      <h1 className="mt-3 font-serif text-[26px] font-semibold">Nuevo proveedor</h1>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <FormularioProveedor />
    </div>
  );
}
