"use client";

import { useCallback, useEffect, useState } from "react";
import { miPerfilAsesor, type AsesorAdmin } from "@/lib/panel/asesores";
import { HorariosAsesor } from "../asesores/HorariosAsesor";

export function MisHorarios() {
  const [perfil, setPerfil] = useState<AsesorAdmin | null | undefined>(undefined);
  const [error, setError] = useState(false);

  const cargar = useCallback(() => {
    miPerfilAsesor().then(setPerfil).catch(() => setError(true));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) return <p role="alert" className="text-vino">No pudimos cargar tu perfil. Intenta de nuevo.</p>;
  if (perfil === undefined) return <p className="text-[#8A8272]">Cargando…</p>;
  if (perfil === null) {
    return <p className="max-w-md bg-white p-6 text-[#4A4538]">Tu cuenta aún no tiene perfil de asesor. Pídele al administrador que lo cree para que puedas cargar tus horarios.</p>;
  }

  return (
    <div className="max-w-4xl">
      <h1 className="font-serif text-[26px] font-semibold">Mis horarios</h1>
      <div className="my-3.5 h-0.5 w-12 bg-gradient-to-r from-dorado-claro to-dorado-oscuro" />
      <p className="mb-6 text-[#8A8272]">Los horarios que cargues aquí son los que verán los clientes al agendar una llamada contigo. Tienes {perfil.franjasLibres} {perfil.franjasLibres === 1 ? "horario libre" : "horarios libres"} y {perfil.asesoriasPendientes} {perfil.asesoriasPendientes === 1 ? "cita pendiente" : "citas pendientes"}.</p>
      <HorariosAsesor asesorId={perfil.id} onCambio={cargar} />
    </div>
  );
}
