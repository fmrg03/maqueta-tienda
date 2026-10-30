import { urlImagen } from "@/lib/imagenes";

interface Props {
  nombre: string;
  imagenUrl?: string | null;
  className?: string;
}

/** Foto del producto; si no tiene, el marcador rayado de siempre. */
export function ImagenMaterial({ nombre, imagenUrl, className = "" }: Props) {
  const src = urlImagen(imagenUrl);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={nombre} loading="lazy" className={`aspect-square w-full border border-[#E3DCCC] bg-[#EDEAE3] object-cover ${className}`} />
    );
  }
  return (
    <div
      className={`flex aspect-square items-end p-2 font-mono text-[10px] text-[#7A7264] ${className}`}
      style={{
        backgroundImage: "repeating-linear-gradient(135deg, #EDEAE3, #EDEAE3 10px, #DCD5C4 10px, #DCD5C4 11px)",
        border: "1px solid #E3DCCC",
      }}
    >
      foto: {nombre.toLowerCase()}
    </div>
  );
}
