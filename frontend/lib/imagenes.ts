import { API_URL, apiFetch } from "./api/client";

/** Las imágenes locales se guardan como "/uploads/…"; se completan con la URL de la API. */
export function urlImagen(url?: string | null): string | null {
  if (!url) return null;
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}

export const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp"];
const LADO_MAX = 1200;

function cargar(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No pudimos leer esa imagen."));
    };
    img.src = url;
  });
}

/** Reduce la foto (lado mayor 1200 px) y la pasa a WebP; las fotos de celular bajan de MBs a ~200 KB. */
export async function reducirImagen(file: File): Promise<Blob> {
  const img = await cargar(file);
  const escala = Math.min(1, LADO_MAX / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * escala);
  canvas.height = Math.round(img.height * escala);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No pudimos procesar la imagen.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.82));
  if (!blob) throw new Error("No pudimos procesar la imagen.");
  return blob;
}

export async function subirImagen(file: File): Promise<string> {
  const blob = await reducirImagen(file);
  const datos = new FormData();
  datos.append("archivo", blob, "foto.webp");
  const r = await apiFetch<{ url: string }>("/api/v1/uploads/imagenes", { method: "POST", body: datos });
  return r.url;
}
