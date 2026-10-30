"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { crearMaterial } from "@/lib/panel/materiales";
import { FormularioMaterial } from "./FormularioMaterial";
import { Pasos } from "./Pasos";

export function NuevoMaterial() {
  const router = useRouter();
  return (
    <div className="max-w-4xl">
      <Link href="/panel/materiales" className="text-sm underline">← Materiales</Link>
      <h1 className="mt-3 font-serif text-[26px] font-semibold">Nuevo material</h1>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <Pasos actual={1} />
      <p className="mb-6 text-[#8A8272]">
        Primero los datos generales del producto. En el siguiente paso agregas sus presentaciones (tamaños, colores…) con precio y stock.
      </p>
      <FormularioMaterial
        textoBoton="Guardar y agregar presentaciones"
        onGuardar={async (datos) => {
          const m = await crearMaterial(datos);
          router.push(`/panel/materiales/${m.id}?nuevo=1`);
        }}
        onCancelar={() => router.push("/panel/materiales")}
      />
    </div>
  );
}
