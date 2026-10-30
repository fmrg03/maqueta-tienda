import { ImagenMaterial } from "./ImagenMaterial";
import Link from "next/link";
import type { Material } from "@/lib/catalogo/catalogo";
import { PrecioBs } from "@/components/ui/PrecioBs";

interface FichaMaterialProps {
  material: Material;
}

export function FichaMaterial({ material }: FichaMaterialProps) {
  const precios = material.variantes.map((v) => v.precioVenta);
  const precioMinimo = precios.length > 0 ? Math.min(...precios) : null;
  const cantidadVariantes = material.variantes.length;

  return (
    <Link
      href={`/catalogo/${material.id}`}
      className="block bg-white p-4 transition-colors hover:bg-[#FAF7F0]"
    >
      <ImagenMaterial nombre={material.nombre} imagenUrl={material.imagenUrl} className="mb-3" />
      <h3 className="text-base font-semibold">{material.nombre}</h3>
      <p className="font-mono text-xs text-[#8A8272]">{material.sku}</p>
      <p className="mt-2.5 font-mono text-[17px] font-medium text-dorado-oscuro">
        {precioMinimo !== null ? `Desde $${precioMinimo.toFixed(2)}` : "Consultar precio"}
      </p>
      {precioMinimo !== null && <PrecioBs usd={precioMinimo} className="font-mono text-xs text-[#8A8272]" />}
      <p className="mt-0.5 text-xs text-[#8A8272]">
        {cantidadVariantes} {cantidadVariantes === 1 ? "presentación" : "presentaciones"}
      </p>
    </Link>
  );
}
