import { PublicHeader } from "@/components/layout/PublicHeader";
import { TarjetaCombo } from "@/components/combos/TarjetaCombo";
import { listarCombos } from "@/lib/catalogo/combos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Combos — Revestimiento Élite RY" };

export default async function CombosPage() {
  const combos = await listarCombos().catch(() => []);

  return (
    <main className="min-h-screen bg-piedra text-negro">
      <PublicHeader variante="claro" />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-serif text-[26px] font-semibold">Combos</h1>
        <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
        <p className="mb-8 text-[#8A8272]">
          Paquetes armados por nuestro equipo a un precio único.
        </p>
        {combos.length === 0 ? (
          <p className="text-[#8A8272]">Por ahora no hay combos disponibles.</p>
        ) : (
          <div className="grid gap-px bg-[#E3DCCC] sm:grid-cols-2 lg:grid-cols-3">
            {combos.map((c) => (
              <TarjetaCombo key={c.id} combo={c} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
