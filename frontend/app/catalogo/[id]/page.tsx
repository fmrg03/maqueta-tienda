import { ImagenMaterial } from "@/components/catalogo/ImagenMaterial";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { SelectorVariante } from "@/components/catalogo/SelectorVariante";
import { ApiError } from "@/lib/api/client";
import { obtenerMaterial } from "@/lib/catalogo/catalogo";

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

  return (
    <main className="min-h-screen bg-piedra text-negro">
      <PublicHeader variante="claro" />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <Link href="/catalogo" className="text-sm text-[#8A8272] hover:text-negro">
          ← Volver al catálogo
        </Link>

        <div className="mt-6 grid gap-10 md:grid-cols-2">
          <ImagenMaterial nombre={material.nombre} imagenUrl={material.imagenUrl} />

          <div>
            {material.categoria && (
              <Link
                href={`/catalogo?categoria=${material.categoria.id}`}
                className="font-mono text-xs uppercase tracking-wide text-dorado-oscuro"
              >
                {material.categoria.nombre}
              </Link>
            )}
            <h1 className="mt-1 font-serif text-3xl font-semibold">{material.nombre}</h1>
            <p className="font-mono text-xs text-[#8A8272]">{material.sku}</p>
            <div className="my-4 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
            {material.descripcion && (
              <p className="mb-8 text-[#4A4538]">{material.descripcion}</p>
            )}
            <SelectorVariante material={material} />
          </div>
        </div>
      </div>
    </main>
  );
}
