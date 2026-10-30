"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { obtenerComboAdmin, type ComboAdmin } from "@/lib/panel/combos";
import { FormularioCombo } from "./FormularioCombo";

export function EditarCombo({ id }: { id: string }) {
  const [combo, setCombo] = useState<ComboAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    obtenerComboAdmin(id)
      .then((c) => vigente && setCombo(c))
      .catch((e) => vigente && setError(e instanceof ApiError && e.statusCode === 404 ? "No encontramos este combo." : "No pudimos cargarlo. Intenta de nuevo."));
    return () => {
      vigente = false;
    };
  }, [id]);

  if (error) return <div><p role="alert" className="text-vino">{error}</p><Link href="/panel/combos" className="mt-3 inline-block underline">Volver a combos</Link></div>;
  if (!combo) return <p className="text-[#8A8272]">Cargando…</p>;
  return (
    <div>
      <Link href="/panel/combos" className="text-sm underline">← Combos</Link>
      <h1 className="mt-3 font-serif text-[26px] font-semibold">{combo.nombre}</h1>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <FormularioCombo inicial={combo} />
    </div>
  );
}
