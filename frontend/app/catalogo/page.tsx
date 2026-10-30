import { PublicShell, TituloPagina } from "@/components/layout/PublicShell";
import { FichaMaterial } from "@/components/catalogo/FichaMaterial";
import { FiltroCategoria, type Orden } from "@/components/catalogo/FiltroCategoria";
import { listarCategorias, listarMateriales, type Material } from "@/lib/catalogo/catalogo";

// Igual que la Home: el stock/precio cambia seguido, así que siempre
// se pide fresco — nunca se cachea esta página.
export const dynamic = "force-dynamic";
export const metadata = { title: "Catálogo — Revestimiento Élite RY" };

interface CatalogoPageProps {
  searchParams: Promise<{ categoria?: string; buscar?: string; orden?: string }>;
}

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const precioMin = (m: Material) => (m.variantes.length ? Math.min(...m.variantes.map((v) => v.precioVenta)) : Infinity);

export default async function CatalogoPage({ searchParams }: CatalogoPageProps) {
  const { categoria, buscar, orden } = await searchParams;

  const [categorias, resultado] = await Promise.all([
    listarCategorias().catch(() => []),
    listarMateriales(1, 100, categoria).catch(() => ({ items: [] as Material[], total: 0, pagina: 1, porPagina: 100 })),
  ]);

  // El catálogo es chico: se filtra y ordena aquí (sin tildes ni mayúsculas).
  const q = buscar ? sinTildes(buscar.trim()) : "";
  let items = resultado.items;
  if (q) {
    items = items.filter((m) => sinTildes(`${m.nombre} ${m.sku} ${m.descripcion ?? ""} ${m.categoria?.nombre ?? ""}`).includes(q));
  }
  const modo = (["precio_asc", "precio_desc"].includes(orden ?? "") ? orden : "nombre") as Orden;
  if (modo === "precio_asc") items = [...items].sort((a, b) => precioMin(a) - precioMin(b));
  if (modo === "precio_desc") items = [...items].sort((a, b) => precioMin(b) - precioMin(a));

  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <TituloPagina>Catálogo</TituloPagina>
        <FiltroCategoria categorias={categorias} />

        <p className="mb-5 mt-8 text-sm text-apagado" aria-live="polite">
          {items.length} {items.length === 1 ? "producto" : "productos"}
          {q && <> para «{buscar}»</>}
        </p>

        {items.length === 0 ? (
          <p className="border border-linea bg-negro-suave p-8 text-texto-secundario">
            No encontramos productos{q ? ` para «${buscar}»` : ""}. Prueba con otra palabra o quita los filtros.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {items.map((m) => <FichaMaterial key={m.id} material={m} />)}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
