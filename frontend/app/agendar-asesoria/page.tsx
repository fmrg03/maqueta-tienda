import { PublicHeader } from "@/components/layout/PublicHeader";
import { AgendarAsesoria } from "@/components/asesorias/AgendarAsesoria";
import { listarAsesores, listarFranjas } from "@/lib/asesorias/asesorias";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agendar asesoría — Revestimiento Élite RY" };

export default async function AgendarAsesoriaPage() {
  const asesores = await listarAsesores().catch(() => null);

  // Con un solo asesor no hay nada que elegir: se traen sus horarios ya.
  const franjasIniciales =
    asesores && asesores.length === 1
      ? await listarFranjas(asesores[0].id).catch(() => null)
      : null;

  return (
    <main className="min-h-screen bg-piedra text-negro">
      <PublicHeader variante="claro" />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-serif text-[26px] font-semibold">Agendar una llamada</h1>
        <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
        <p className="mb-8 text-[#8A8272]">
          Elige un horario y un asesor te llamará por WhatsApp para conversar qué
          necesitas. Si podemos ayudarte, la visita se coordina directamente contigo después.
        </p>
        {asesores === null ? (
          <p role="alert" className="text-vino">
            No pudimos cargar los asesores. Inténtalo de nuevo en unos minutos.
          </p>
        ) : asesores.length === 0 ? (
          <p className="text-[#8A8272]">
            Por ahora no hay asesores disponibles para agendar. Escríbenos por WhatsApp.
          </p>
        ) : (
          <AgendarAsesoria asesores={asesores} franjasIniciales={franjasIniciales} />
        )}
      </div>
    </main>
  );
}
