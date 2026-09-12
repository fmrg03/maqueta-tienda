import { ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

type Variante = "primario" | "secundario" | "secundario-oscuro";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
}

/**
 * Botón base del sistema de diseño (ver docs/fase1-ux-ui.md).
 * - `primario`: degradé dorado — un solo botón primario por pantalla.
 * - `secundario`: borde negro, para fondos claros (piedra).
 * - `secundario-oscuro`: borde claro, para fondos oscuros (home, sidebar).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variante = "primario", className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "rounded-sm px-6 py-3 text-sm font-medium transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado",
          "disabled:cursor-not-allowed disabled:opacity-50",
          {
            "bg-gradient-to-br from-dorado-claro to-dorado-oscuro text-negro font-semibold hover:brightness-105":
              variante === "primario",
            "border border-negro text-negro hover:bg-negro hover:text-texto-claro":
              variante === "secundario",
            "border border-texto-secundario text-texto-claro hover:bg-texto-claro hover:text-negro":
              variante === "secundario-oscuro",
          },
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
