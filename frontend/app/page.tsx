import Link from "next/link";
import { PublicShell } from "@/components/layout/PublicShell";
import { MosaicoPiedra } from "@/components/layout/MosaicoPiedra";
import { FichaMaterial } from "@/components/catalogo/FichaMaterial";
import { TarjetaCombo } from "@/components/combos/TarjetaCombo";
import { Button } from "@/components/ui/Button";
import { listarCategorias, listarMateriales, type Categoria, type Material } from "@/lib/catalogo/catalogo";
import { listarCombos, type Combo } from "@/lib/catalogo/combos";

// Explícito, no implícito: lo que se muestra lo administra el negocio desde
// el panel, así que esta página SIEMPRE pide datos frescos en cada visita.
export const dynamic = "force-dynamic";

async function cargar(): Promise<{ categorias: Categoria[]; nuevos: Material[]; combos: Combo[] }> {
  const [categorias, materiales, combos] = await Promise.all([
    listarCategorias().catch(() => []),
    listarMateriales(1, 100).catch(() => ({ items: [] as Material[] })),
    listarCombos().catch(() => []),
  ]);
  const nuevos = [...materiales.items]
    .filter((m) => m.variantes.some((v) => v.stock > 0))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);
  return { categorias, nuevos, combos: combos.slice(0, 3) };
}

function Seccion({ titulo, enlace, children }: { titulo: string; enlace?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-20">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">{titulo}</h2>
          <div className="junta-dorada mt-3 h-0.5 w-12" />
        </div>
        {enlace && (
          <Link href={enlace.href} className="text-sm text-dorado-claro underline-offset-4 hover:underline">
            {enlace.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const { categorias, nuevos, combos } = await cargar();

  return (
    <PublicShell>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-4 pt-14 md:grid-cols-[1.05fr_1fr] md:pt-20">
        <div>
          <h1 className="font-serif text-4xl font-semibold leading-[1.08] tracking-tight md:text-6xl">
            Del boceto a la realidad: revestimientos de alta gama para tu proyecto.
          </h1>
          <div className="junta-dorada my-6 h-0.5 w-14" />
          <p className="max-w-md text-lg leading-relaxed text-texto-secundario">
            Porcelanato, cerámica, grifería y sanitarios premium. Arma tu consulta y te contactamos por WhatsApp con precio y disponibilidad reales.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/catalogo"><Button variante="primario">Ver catálogo</Button></Link>
            <Link href="/agendar-asesoria"><Button variante="secundario-oscuro">Agendar una llamada</Button></Link>
          </div>
        </div>
        <MosaicoPiedra />
      </section>

      {categorias.length > 0 && (
        <Seccion titulo="Categorías">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {categorias.map((c) => (
              <Link
                key={c.id}
                href={`/catalogo?categoria=${c.id}`}
                className="group relative flex min-h-[120px] flex-col justify-end overflow-hidden border border-linea bg-negro-suave p-5 transition-colors hover:border-dorado-oscuro focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado"
              >
                <span className="junta-dorada absolute left-0 top-0 h-0.5 w-0 transition-all duration-500 group-hover:w-full" />
                <span className="font-serif text-lg font-semibold">{c.nombre}</span>
                <span className="mt-1 text-xs text-apagado">Ver productos</span>
              </Link>
            ))}
          </div>
        </Seccion>
      )}

      {nuevos.length > 0 && (
        <Seccion titulo="Recién llegados" enlace={{ href: "/catalogo", label: "Ver todo el catálogo" }}>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
            {nuevos.map((m) => <FichaMaterial key={m.id} material={m} />)}
          </div>
        </Seccion>
      )}

      {combos.length > 0 && (
        <Seccion titulo="Combos" enlace={{ href: "/combos", label: "Ver todos los combos" }}>
          <div className="grid gap-5 md:grid-cols-3">
            {combos.map((c) => <TarjetaCombo key={c.id} combo={c} />)}
          </div>
        </Seccion>
      )}

      <section className="mx-auto max-w-6xl px-6 pt-20">
        <div className="junta-dorada p-px">
          <div className="grano flex flex-col items-start justify-between gap-6 bg-carbon px-8 py-10 md:flex-row md:items-center">
            <div className="max-w-xl">
              <h2 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">¿No sabes qué elegir?</h2>
              <p className="mt-2 text-texto-secundario">
                Agenda una llamada: un asesor te escucha, te orienta con materiales y medidas, y si podemos ayudarte coordinamos la visita contigo.
              </p>
            </div>
            <Link href="/agendar-asesoria"><Button>Agendar una llamada</Button></Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
