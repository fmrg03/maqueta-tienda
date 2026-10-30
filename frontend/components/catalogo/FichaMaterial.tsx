import Link from "next/link";
import type { Material } from "@/lib/catalogo/catalogo";
import { PrecioBs } from "@/components/ui/PrecioBs";
import { ImagenMaterial } from "./ImagenMaterial";

interface FichaMaterialProps {
  material: Material;
}

export function FichaMaterial({ material }: FichaMaterialProps) {
  const precios = material.variantes.map((v) => v.precioVenta);
  const precioMinimo = precios.length > 0 ? Math.min(...precios) : null;
  const cantidadVariantes = material.variantes.length;
  const agotado = cantidadVariantes > 0 && material.variantes.every((v) => v.stock <= 0);

  return (
    <Link
      href={`/catalogo/${material.id}`}
      className="group flex h-full flex-col border border-linea bg-negro-suave transition-all duration-300 hover:-translate-y-1 hover:border-dorado-oscuro hover:shadow-[0_12px_30px_-12px_rgba(212,175,55,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado"
    >
      <div className="relative overflow-hidden">
        <ImagenMaterial nombre={material.nombre} imagenUrl={material.imagenUrl} className="transition-transform duration-500 group-hover:scale-[1.04]" />
        {agotado && <span className="absolute left-3 top-3 bg-negro/80 px-2 py-1 text-xs text-texto-secundario">Agotado</span>}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-serif text-lg font-semibold leading-snug">{material.nombre}</h3>
        {material.categoria && <p className="mt-0.5 text-xs text-apagado">{material.categoria.nombre}</p>}
        <div className="mt-auto pt-4">
          <p className="font-mono text-lg font-medium text-dorado-claro">
            {precioMinimo !== null ? `Desde $${precioMinimo.toFixed(2)}` : "Consultar precio"}
          </p>
          {precioMinimo !== null && <PrecioBs usd={precioMinimo} className="font-mono text-xs text-apagado" />}
          <p className="mt-1 text-xs text-apagado">
            {cantidadVariantes} {cantidadVariantes === 1 ? "presentación" : "presentaciones"}
          </p>
        </div>
      </div>
    </Link>
  );
}
