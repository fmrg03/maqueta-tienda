import { clsx } from "clsx";

export function Pasos({ actual }: { actual: 1 | 2 }) {
  const pasos = ["Datos del producto", "Presentaciones, precios y stock"];
  return (
    <ol className="mb-6 flex flex-wrap gap-x-6 gap-y-1 text-sm" aria-label="Pasos">
      {pasos.map((p, i) => (
        <li key={p} aria-current={actual === i + 1 ? "step" : undefined} className={clsx("flex items-center gap-2", actual === i + 1 ? "font-semibold" : "text-[#8A8272]")}>
          <span
            className={clsx(
              "flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs",
              actual > i + 1 ? "bg-esmeralda text-white" : actual === i + 1 ? "bg-negro text-texto-claro" : "border border-piedra-oscura",
            )}
          >
            {actual > i + 1 ? "✓" : i + 1}
          </span>
          {p}
        </li>
      ))}
    </ol>
  );
}
