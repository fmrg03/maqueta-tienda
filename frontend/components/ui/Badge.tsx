import { clsx } from "clsx";

type Tono = "neutro" | "exito" | "alerta" | "dorado";

interface BadgeProps {
  children: React.ReactNode;
  tono?: Tono;
}

/**
 * Etiqueta de estado — SIEMPRE en font-mono, porque son datos/estados
 * reales (nueva, contactado, stock bajo), no decoración de texto.
 */
export function Badge({ children, tono = "neutro" }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-block rounded-sm px-2 py-0.5 font-mono text-xs",
        {
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
