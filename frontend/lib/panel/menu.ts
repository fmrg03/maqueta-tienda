import type { RolUsuario } from "../auth/auth";

export interface ItemMenu {
  href: string;
  label: string;
  descripcion: string;
  roles: RolUsuario[];
  /** false = módulo planificado cuya pantalla aún no se construyó. */
  disponible: boolean;
}

// Fuente única de qué ve cada rol (ver docs/diseno/guia-pantallas.md §3).
// OJO: esto solo decide qué se MUESTRA. Cada endpoint del backend vuelve a
// validar el rol (RolesGuard) y la base de datos aplica RLS.
export const MENU_PANEL: ItemMenu[] = [
  { href: "/panel", label: "Resumen", descripcion: "Tu punto de partida", roles: ["admin", "ventas", "asesor"], disponible: true },
  { href: "/panel/carrito", label: "Solicitudes de carrito", descripcion: "Consultas de clientes por contactar", roles: ["admin", "ventas"], disponible: true },
  { href: "/panel/asesorias", label: "Asesorías", descripcion: "Llamadas agendadas por clientes", roles: ["admin", "asesor"], disponible: false },
  { href: "/panel/materiales", label: "Materiales", descripcion: "Productos, presentaciones y precios", roles: ["admin"], disponible: false },
  { href: "/panel/movimientos", label: "Movimientos", descripcion: "Entradas y salidas de inventario", roles: ["admin"], disponible: false },
  { href: "/panel/combos", label: "Combos", descripcion: "Paquetes de productos", roles: ["admin"], disponible: false },
  { href: "/panel/proveedores", label: "Proveedores", descripcion: "Proveedores y costos", roles: ["admin"], disponible: false },
  { href: "/panel/reportes", label: "Reportes", descripcion: "Inventario y ganancias por período", roles: ["admin"], disponible: false },
  { href: "/panel/configuracion", label: "Configuración", descripcion: "Tasa BCV y descuento por divisas", roles: ["admin"], disponible: true },
  { href: "/panel/asesores", label: "Asesores", descripcion: "Asesores y su disponibilidad", roles: ["admin"], disponible: false },
  { href: "/panel/usuarios", label: "Usuarios", descripcion: "Cuentas y roles", roles: ["admin"], disponible: false },
];

export function menuParaRol(rol: RolUsuario): ItemMenu[] {
  return MENU_PANEL.filter((i) => i.roles.includes(rol));
}

/** Ítem del menú que corresponde a una ruta (la más específica). */
export function itemDeRuta(pathname: string): ItemMenu | undefined {
  return [...MENU_PANEL]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
}
