import { PublicHeader } from "@/components/layout/PublicHeader";
import { FichaMaterial } from "@/components/catalogo/FichaMaterial";
import { FiltroCategoria } from "@/components/catalogo/FiltroCategoria";
import { listarCategorias, listarMateriales } from "@/lib/catalogo/catalogo";

// Igual que la Home: el stock/precio cambia seguido, así que siempre
// se pide fresco — nunca se cachea esta página.
export const dynamic = "force-dynamic";

interface CatalogoPageProps {
  searchParams: Promise<{ categoria?: string }>;
}

export default async function CatalogoPage({ searchParams }: CatalogoPageProps) {
  const { categoria } = await searchParams;

  const [categorias, resultado] = await Promise.all([
    listarCategorias().catch(() => []),
    listarMateriales(1, 20, categoria).catch(() => ({
      items: [],
      total: 0,
      pagina: 1,
      porPagina: 20,
    })),
  ]);

  return (
    <main className="min-h-screen bg-piedra text-negro">
      <PublicHeader variante="claro" />

      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-serif text-[26px] font-semibold">Catálogo</h1>
        <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />

        <div className="mb-7">
          <FiltroCategoria categorias={categorias} />
        </div>

        {resultado.items.length === 0 ? (
          <p className="text-[#8A8272]">
            No encontramos materiales{categoria ? " en esta categoría" : ""} por ahora.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-px bg-[#E3DCCC] sm:grid-cols-2 md:grid-cols-3">
            {resultado.items.map((material) => (
              <FichaMaterial key={material.id} material={material} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
