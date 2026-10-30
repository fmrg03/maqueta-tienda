import { ImagenMaterial } from "@/components/catalogo/ImagenMaterial";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicShell } from "@/components/layout/PublicShell";
import { FichaMaterial } from "@/components/catalogo/FichaMaterial";
import { SelectorVariante } from "@/components/catalogo/SelectorVariante";
import { ApiError } from "@/lib/api/client";
import { listarMateriales, obtenerMaterial } from "@/lib/catalogo/catalogo";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

// cache() evita pedir el material dos veces (metadata + página).
const obtenerMaterialOnce = cache(async (id: string) => {
  try {
    return await obtenerMaterial(id);
  } catch (e) {
    if (e instanceof ApiError && (e.statusCode === 404 || e.statusCode === 400)) return null;
    throw e;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const material = await obtenerMaterialOnce(id);
  return { title: material ? `${material.nombre} — Revestimiento Élite RY` : "Producto no encontrado" };
}

export default async function FichaProductoPage({ params }: Props) {
  const { id } = await params;
  const material = await obtenerMaterialOnce(id);
  if (!material) notFound();

  // Más productos de la misma categoría (o, si no hay, los primeros del catálogo).
  const relacionados = await listarMateriales(1, 12, material.categoria?.id)
    .then((r) => r.items.filter((m) => m.id !== material.id && m.variantes.length > 0).slice(0, 4))
    .catch(() => []);

  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl px-6 py-10 pb-28 md:pb-12">
        <Link href="/catalogo" className="text-sm text-apagado transition-colors hover:text-dorado-claro">
          ← Volver al catálogo
        </Link>

        <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-14">
          <div className="border border-linea">
            <ImagenMaterial nombre={material.nombre} imagenUrl={material.imagenUrl} />
          </div>

          <div>
            {material.categoria && (
              <Link href={`/catalogo?categoria=${material.categoria.id}`} className="text-sm text-dorado-claro underline-offset-4 hover:underline">
                {material.categoria.nombre}
              </Link>
            )}
            <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight md:text-4xl">{material.nombre}</h1>
            <p className="mt-1 font-mono text-xs text-apagado">{material.sku}</p>
            <div className="junta-dorada my-5 h-0.5 w-14" />
            {material.descripcion && <p className="mb-8 max-w-prose text-texto-secundario">{material.descripcion}</p>}
            <SelectorVariante material={material} />
          </div>
        </div>

        {relacionados.length > 0 && (
          <section className="mt-20">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">También te puede interesar</h2>
            <div className="junta-dorada mb-8 mt-3 h-0.5 w-12" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
              {relacionados.map((m) => <FichaMaterial key={m.id} material={m} />)}
            </div>
          </section>
        )}
      </div>
    </PublicShell>
  );
}
