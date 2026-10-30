import { urlImagen } from "@/lib/imagenes";

interface Props {
  nombre: string;
  imagenUrl?: string | null;
  className?: string;
}

/** Foto del producto; si no tiene, una baldosa de piedra oscura con el nombre. */
export function ImagenMaterial({ nombre, imagenUrl, className = "" }: Props) {
  const src = urlImagen(imagenUrl);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={nombre} loading="lazy" className={`aspect-square w-full bg-[#e8e1d3] object-cover ${className}`} />
    );
  }
  return (
    <div
      role="img"
      aria-label={`Sin foto: ${nombre}`}
      className={`grano flex aspect-square items-end bg-[#1b1914] p-3 font-mono text-[11px] text-apagado ${className}`}
    >
      sin foto
    </div>
  );
}
