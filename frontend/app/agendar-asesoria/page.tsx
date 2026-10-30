import { PublicShell, TituloPagina } from "@/components/layout/PublicShell";
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
    <PublicShell>
      <div className="mx-auto max-w-3xl px-6 py-12">
        <TituloPagina descripcion="Elige un horario y un asesor te llamará por WhatsApp para conversar qué necesitas. Si podemos ayudarte, la visita se coordina directamente contigo después.">
          Agendar una llamada
        </TituloPagina>
        {asesores === null ? (
          <p role="alert" className="text-[#f0a09c]">
            No pudimos cargar los asesores. Inténtalo de nuevo en unos minutos.
          </p>
        ) : asesores.length === 0 ? (
          <p className="border border-linea bg-negro-suave p-8 text-texto-secundario">
            Por ahora no hay asesores disponibles para agendar. Escríbenos por WhatsApp.
          </p>
        ) : (
          <div className="bg-piedra p-6 text-negro md:p-8">
            <AgendarAsesoria asesores={asesores} franjasIniciales={franjasIniciales} />
          </div>
        )}
      </div>
    </PublicShell>
  );
}
