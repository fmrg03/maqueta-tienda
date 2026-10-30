/**
 * Portada sin foto: baldosas de piedra con juntas doradas, como un revestimiento recién colocado.
 * Cuando haya una foto real del negocio se reemplaza este componente por la imagen.
 * Las baldosas se asientan una a una al cargar (única animación de entrada del sitio).
 */
interface Baldosa {
  clase: string;
  fondo: string;
}

const BALDOSAS: Baldosa[] = [
  // Mármol negro con veta dorada (la baldosa grande)
  {
    clase: "col-span-2 row-span-2",
    fondo:
      "linear-gradient(118deg, transparent 38%, rgba(242,201,76,.55) 38.4%, rgba(242,201,76,0) 39.2%, transparent 52%, rgba(242,201,76,.28) 52.3%, transparent 53%), radial-gradient(120% 90% at 20% 10%, #2a2723, #0f0e0c 70%)",
  },
  // Mármol claro
  {
    clase: "",
    fondo:
      "linear-gradient(35deg, transparent 45%, rgba(120,110,95,.35) 45.4%, transparent 46.2%), linear-gradient(145deg, #efe9dc, #d6cdbb)",
  },
  // Pizarra
  { clase: "", fondo: "linear-gradient(160deg, #4a5560, #2c333a)" },
  // Travertino
  {
    clase: "",
    fondo:
      "repeating-linear-gradient(0deg, rgba(120,95,60,.18) 0 2px, transparent 2px 9px), linear-gradient(160deg, #d9c7a6, #bfa982)",
  },
  // Terrazo
  {
    clase: "",
    fondo:
      "radial-gradient(circle at 20% 30%, #b8860b 0 3px, transparent 4px), radial-gradient(circle at 70% 20%, #7a2e2e 0 4px, transparent 5px), radial-gradient(circle at 55% 70%, #2f6e52 0 3px, transparent 4px), radial-gradient(circle at 30% 80%, #efe9dc 0 4px, transparent 5px), radial-gradient(circle at 85% 65%, #8c8577 0 3px, transparent 4px), linear-gradient(160deg, #cfc7b6, #b3aa97)",
  },
  // Espiga
  {
    clase: "",
    fondo:
      "repeating-linear-gradient(45deg, #1d1a16 0 10px, #2c2822 10px 11px), linear-gradient(#1d1a16, #1d1a16)",
  },
  // Verde piedra
  { clase: "", fondo: "linear-gradient(150deg, #3d5b4d, #25382f)" },
  // Arena
  { clase: "", fondo: "linear-gradient(150deg, #e4d6b8, #cdbb96)" },
  // Gris cálido
  {
    clase: "",
    fondo:
      "linear-gradient(60deg, transparent 55%, rgba(255,255,255,.18) 55.4%, transparent 56.2%), linear-gradient(150deg, #8c8577, #6b655a)",
  },
];

export function MosaicoPiedra() {
  return (
    <div
      role="img"
      aria-label="Muestras de porcelanato y piedra"
      className="junta-dorada grid aspect-[4/3] grid-cols-4 grid-rows-3 gap-[3px] p-[3px] shadow-[0_30px_60px_-30px_rgba(212,175,55,0.35)]"
    >
      {BALDOSAS.map((b, i) => (
        <div key={i} className={`baldosa relative ${b.clase}`} style={{ backgroundImage: b.fondo, ["--i" as string]: i } as React.CSSProperties}>
          <div className="grano absolute inset-0 opacity-40 mix-blend-overlay" />
        </div>
      ))}
    </div>
  );
}
