import { apiFetch } from "../api/client";
import type { VarianteAdmin } from "./materiales";

export interface ProveedorAdmin {
  id: string;
  nombre: string;
  contacto?: string | null;
  condicionesPago?: string | null;
  activo: boolean;
  productos?: number;
}

export type FiltroEstadoProveedor = "activos" | "inactivos" | "todos";

export interface ProductoProveedor {
  id: string;
  precioCostoProveedor: number;
  tiempoEntregaDias: number;
  variante: VarianteAdmin & { material?: { id: string; nombre: string } };
}

export const listarProveedores = (estado: FiltroEstadoProveedor) =>
  apiFetch<ProveedorAdmin[]>(`/api/v1/proveedores?estado=${estado}`);

export const obtenerProveedor = (id: string) => apiFetch<ProveedorAdmin>(`/api/v1/proveedores/${id}`);

export interface DatosProveedor {
  nombre: string;
  contacto?: string;
  condicionesPago?: string;
}

export const crearProveedor = (d: DatosProveedor) =>
  apiFetch<ProveedorAdmin>("/api/v1/proveedores", { method: "POST", body: JSON.stringify(d) });

export const actualizarProveedor = (id: string, d: Partial<DatosProveedor> & { activo?: boolean }) =>
  apiFetch<ProveedorAdmin>(`/api/v1/proveedores/${id}`, { method: "PATCH", body: JSON.stringify(d) });

const normProducto = (p: ProductoProveedor): ProductoProveedor => ({
  ...p,
  precioCostoProveedor: Number(p.precioCostoProveedor),
  tiempoEntregaDias: Number(p.tiempoEntregaDias),
  variante: { ...p.variante, stock: Number(p.variante.stock), precioVenta: Number(p.variante.precioVenta), precioCosto: Number(p.variante.precioCosto) },
});

export async function listarProductosProveedor(id: string): Promise<ProductoProveedor[]> {
  return (await apiFetch<ProductoProveedor[]>(`/api/v1/proveedores/${id}/productos`)).map(normProducto);
}

export const agregarProducto = (proveedorId: string, d: { varianteId: string; precioCostoProveedor: number; tiempoEntregaDias: number }) =>
  apiFetch(`/api/v1/proveedores/${proveedorId}/productos`, { method: "POST", body: JSON.stringify(d) });

export const actualizarProducto = (id: string, d: { precioCostoProveedor?: number; tiempoEntregaDias?: number }) =>
  apiFetch(`/api/v1/proveedor-productos/${id}`, { method: "PATCH", body: JSON.stringify(d) });

export const quitarProducto = (id: string) => apiFetch(`/api/v1/proveedor-productos/${id}`, { method: "DELETE" });
