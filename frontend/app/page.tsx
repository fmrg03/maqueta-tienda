import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Button } from "@/components/ui/Button";
import { listarCategorias, type Categoria } from "@/lib/catalogo/catalogo";

// Explícito, no implícito: las categorías las administra el negocio
// desde el panel, así que esta página SIEMPRE debe pedir datos frescos
// en cada visita — no confiamos en el comportamiento por defecto de
// caching de fetch para algo que cambia vía admin.
export const dynamic = "force-dynamic";

async function obtenerCategorias(): Promise<Categoria[]> {
  try {
    return await listarCategorias();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const categorias = await obtenerCategorias();

  return (
    <main className="min-h-screen bg-negro text-texto-claro">
      <PublicHeader variante="oscuro" />

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <h1 className="font-serif text-4xl font-semibold leading-tight md:text-5xl">
              Del boceto a la realidad: revestimientos de alta gama para tu
              proyecto.
            </h1>
            <div className="my-5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
            <p className="max-w-md text-texto-secundario">
              Porcelanato, cerámica, grifería y sanitarios premium. Armá tu
              consulta y te contactamos por WhatsApp para asesorarte con
              precio y disponibilidad real.
            </p>
            <div className="mt-7 flex gap-3">
              <Link href="/catalogo">
                <Button variante="primario">Ver catálogo</Button>
              </Link>
              <Link href="/agendar-asesoria">
                <Button variante="secundario-oscuro">
                  Agendar una llamada
                </Button>
              </Link>
            </div>
          </div>

          <div
            className="flex aspect-[4/3] items-end border border-dorado-oscuro p-3 font-mono text-xs text-texto-secundario"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, #211E19, #211E19 10px, #33302A 10px, #33302A 11px)",
            }}
          >
            foto real: baño remodelado, porcelanato + grifería negra
          </div>
        </div>

        {categorias.length > 0 && (
          <div className="mt-16">
            <h2 className="font-serif text-2xl font-semibold">Categorías</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              {categorias.map((categoria) => (
                <Link
                  key={categoria.id}
                  href={`/catalogo?categoria=${categoria.id}`}
                  className="border border-[#3A362E] bg-negro-suave px-4 py-4 text-sm font-medium text-texto-claro transition-colors hover:border-dorado"
                >
                  {categoria.nombre}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
