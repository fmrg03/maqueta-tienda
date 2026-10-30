"use client";

import { useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { subirImagen, TIPOS_IMAGEN, urlImagen } from "@/lib/imagenes";

interface Props {
  valor: string;
  onCambio: (url: string) => void;
}

export function CampoImagen({ valor, onCambio }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const src = urlImagen(valor);

  async function procesar(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!TIPOS_IMAGEN.includes(file.type)) {
      setError("Ese archivo no es una foto. Usa una imagen JPG, PNG o WebP.");
      return;
    }
    setSubiendo(true);
    try {
      onCambio(await subirImagen(file));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos subir la foto. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSubiendo(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Foto del producto (opcional)</span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          void procesar(e.dataTransfer.files[0]);
        }}
        className={`flex flex-wrap items-center gap-4 border border-dashed p-4 ${arrastrando ? "border-dorado bg-[#FAF7F0]" : "border-piedra-oscura bg-white"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt="Vista previa de la foto" className="h-24 w-24 border border-piedra-oscura object-cover" /> : (
          <div className="flex h-24 w-24 items-center justify-center bg-piedra-oscura/40 text-center text-xs text-[#8A8272]">Sin foto</div>
        )}
        <div className="flex flex-col items-start gap-2 text-sm">
          <input ref={input} type="file" accept={TIPOS_IMAGEN.join(",")} className="sr-only" aria-label="Elegir foto" onChange={(e) => void procesar(e.target.files?.[0])} />
          <button type="button" disabled={subiendo} onClick={() => input.current?.click()} className="rounded-sm border border-negro px-4 py-2 font-medium hover:bg-negro hover:text-texto-claro disabled:opacity-50">
            {subiendo ? "Subiendo…" : src ? "Cambiar foto" : "Subir foto"}
          </button>
          {src && !subiendo && (
            <button type="button" onClick={() => onCambio("")} className="underline">Quitar foto</button>
          )}
          <span className="text-xs text-[#8A8272]">También puedes arrastrar la foto hasta aquí. La reducimos automáticamente.</span>
        </div>
      </div>
      {error && <span role="alert" className="text-xs text-vino">{error}</span>}
    </div>
  );
}
