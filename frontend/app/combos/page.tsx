import { PublicShell, TituloPagina } from "@/components/layout/PublicShell";
import { TarjetaCombo } from "@/components/combos/TarjetaCombo";
import { listarCombos } from "@/lib/catalogo/combos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Combos — Revestimiento Élite RY" };

export default async function CombosPage() {
  const combos = await listarCombos().catch(() => []);

  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <TituloPagina descripcion="Paquetes armados por nuestro equipo a un precio único.">Combos</TituloPagina>
        {combos.length === 0 ? (
          <p className="border border-linea bg-negro-suave p-8 text-texto-secundario">Por ahora no hay combos disponibles.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {combos.map((c) => <TarjetaCombo key={c.id} combo={c} />)}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
