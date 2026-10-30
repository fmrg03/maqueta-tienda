import { clsx } from "clsx";

type Tono = "neutro" | "exito" | "alerta" | "dorado";

interface BadgeProps {
  children: React.ReactNode;
  tono?: Tono;
  /** Colores para fondos oscuros (sitio público). */
  oscuro?: boolean;
}

/**
 * Etiqueta de estado — SIEMPRE en font-mono, porque son datos/estados
 * reales (nueva, contactado, stock bajo), no decoración de texto.
 */
export function Badge({ children, tono = "neutro", oscuro = false }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-block rounded-sm px-2 py-0.5 font-mono text-xs",
        oscuro
          ? {
              "bg-white/10 text-texto-claro": tono === "neutro",
              "bg-[#3f8f6c]/20 text-[#7fd1a8]": tono === "exito",
              "bg-[#c0504d]/20 text-[#f0a09c]": tono === "alerta",
              "bg-dorado-claro/15 text-dorado-claro": tono === "dorado",
            }
          : {
              "bg-piedra-oscura text-negro": tono === "neutro",
              "bg-esmeralda/15 text-esmeralda": tono === "exito",
              "bg-vino/15 text-vino": tono === "alerta",
              "bg-dorado-claro/20 text-dorado-oscuro": tono === "dorado",
            },
      )}
    >
      {children}
    </span>
  );
}
