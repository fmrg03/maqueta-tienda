import { apiFetch, descargarArchivo } from "../api/client";

export interface FilaImportacion {
  sku: string;
  nombre: string;
  categoria?: string;
  skuVariante?: string;
  presentacion?: string;
  precioVenta: number;
  precioDivisas?: number | null;
  precioCosto: number;
  stock?: number;
  tiempoEntregaDias?: number;
}

export interface FilaValidada extends Partial<FilaImportacion> {
  fila: number;
  errores: string[];
  materialExiste?: boolean;
}

export interface ResultadoValidacion {
  errorGlobal: string[];
  filas: FilaValidada[];
  total: number;
  conErrores: number;
  validas: number;
}

export const descargarPlantilla = () => descargarArchivo("/api/v1/inventario/importacion/plantilla", "plantilla-productos.xlsx");

export function leerExcel(archivo: File, proveedorId?: string): Promise<ResultadoValidacion> {
  const datos = new FormData();
  datos.append("archivo", archivo);
  const q = proveedorId ? `?proveedorId=${encodeURIComponent(proveedorId)}` : "";
  return apiFetch<ResultadoValidacion>(`/api/v1/inventario/importacion/excel${q}`, { method: "POST", body: datos });
}

export const validarFilas = (filas: FilaImportacion[], proveedorId?: string) =>
  apiFetch<ResultadoValidacion>("/api/v1/inventario/importacion/validar", { method: "POST", body: JSON.stringify({ proveedorId, filas }) });

export const importarFilas = (filas: FilaImportacion[], proveedorId?: string) =>
  apiFetch<{ productosNuevos: number; presentaciones: number }>("/api/v1/inventario/importacion", {
    method: "POST",
    body: JSON.stringify({ proveedorId, filas }),
  });
