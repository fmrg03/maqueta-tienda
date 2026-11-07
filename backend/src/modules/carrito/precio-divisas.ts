/**
 * Precio en divisas que se congela en una línea. Solo aplica si la línea se
 * vende al precio de lista: si el asesor pactó otro precio, ese precio ya es
 * el acordado y vale igual en cualquier método (null = igual al precio normal).
 */
export function precioDivisasLinea(
  precio: number | null | undefined,
  lista: number | null | undefined,
  divisas: number | null | undefined,
): number | null {
  if (precio === null || precio === undefined || lista === null || lista === undefined) return null;
  if (divisas === null || divisas === undefined) return null;
  return Math.abs(Number(precio) - Number(lista)) < 0.005 ? Number(divisas) : null;
}
