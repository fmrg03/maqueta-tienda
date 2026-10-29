import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-piedra text-negro">
      <PublicHeader variante="claro" />
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl font-semibold">No encontramos esta página</h1>
        <p className="mt-3 text-[#8A8272]">
          El producto que buscás no existe o ya no está disponible.
        </p>
        <Link href="/catalogo" className="mt-6 inline-block underline">
          Ir al catálogo
        </Link>
      </div>
    </main>
  );
}
