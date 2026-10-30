import Link from "next/link";

// Módulos planificados cuya pantalla aún no existe: se ven dentro del panel
// (con su menú y el control de rol) en vez de un 404 suelto.
export default function ModuloEnConstruccion() {
  return (
    <div className="max-w-md">
      <h1 className="font-serif text-xl font-semibold">Módulo en construcción</h1>
      <p className="mt-2 text-[#4A4538]">Esta sección estará disponible próximamente.</p>
      <Link href="/panel" className="mt-4 inline-block underline">
        Volver al resumen
      </Link>
    </div>
  );
}
