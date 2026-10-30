import Link from "next/link";
import { PublicShell } from "@/components/layout/PublicShell";

export default function NotFound() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">No encontramos esta página</h1>
        <div className="junta-dorada mx-auto my-5 h-0.5 w-14" />
        <p className="text-texto-secundario">El producto que buscas no existe o ya no está disponible.</p>
        <Link href="/catalogo" className="mt-8 inline-block text-dorado-claro underline underline-offset-4">
          Ir al catálogo
        </Link>
      </div>
    </PublicShell>
  );
}
