import { tienePermiso, type Usuario } from "../auth/auth";

export interface ItemMenu {
  href: string;
  label: string;
  descripcion: string;
  /** Basta uno de estos permisos. */
  permisos?: string[];
  /** Solo el administrador (usuarios y roles no son delegables). */
  soloAdmin?: boolean;
  /** false = módulo planificado cuya pantalla aún no se construyó. */
  disponible: boolean;
}

// Fuente única de qué ve cada rol (ver docs/diseno/guia-pantallas.md §3).
// OJO: esto solo decide qué se MUESTRA. Cada endpoint del backend vuelve a
// validar los permisos del rol (RolesGuard) y la base de datos aplica RLS.
export const MENU_PANEL: ItemMenu[] = [
  { href: "/panel", label: "Resumen", descripcion: "Tu punto de partida", permisos: ["*"], disponible: true },
  { href: "/panel/carrito", label: "Solicitudes de carrito", descripcion: "Consultas de clientes por contactar", permisos: ["solicitudes.ver"], disponible: true },
  { href: "/panel/presupuestos", label: "Presupuestos", descripcion: "Cotizaciones con productos y servicios", permisos: ["presupuestos.ver"], disponible: true },
  { href: "/panel/asesorias", label: "Asesorías", descripcion: "Llamadas agendadas por clientes", permisos: ["asesorias.propias", "asesorias.todas"], disponible: true },
  { href: "/panel/mis-horarios", label: "Mis horarios", descripcion: "Cuándo puedes atender llamadas", permisos: ["asesorias.propias"], disponible: true },
  { href: "/panel/materiales", label: "Materiales", descripcion: "Productos, presentaciones y precios", permisos: ["inventario.ver"], disponible: true },
  { href: "/panel/movimientos", label: "Movimientos", descripcion: "Entradas y salidas de inventario", permisos: ["inventario.ver"], disponible: true },
  { href: "/panel/servicios", label: "Servicios", descripcion: "Lista de servicios y precios base", permisos: ["servicios.ver", "servicios.gestionar"], disponible: true },
  { href: "/panel/combos", label: "Combos", descripcion: "Paquetes de productos", permisos: ["inventario.ver"], disponible: true },
  { href: "/panel/proveedores", label: "Proveedores", descripcion: "Proveedores y costos", permisos: ["proveedores.ver"], disponible: true },
  { href: "/panel/reportes", label: "Reportes", descripcion: "Inventario y ganancias por período", permisos: ["reportes.ver"], disponible: true },
  { href: "/panel/configuracion", label: "Configuración", descripcion: "Tasa BCV y reservas", permisos: ["configuracion.ver"], disponible: true },
  { href: "/panel/asesores", label: "Asesores", descripcion: "Asesores y su disponibilidad", soloAdmin: true, disponible: true },
  { href: "/panel/roles", label: "Roles y permisos", descripcion: "Qué puede hacer cada rol", soloAdmin: true, disponible: true },
  { href: "/panel/usuarios", label: "Usuarios", descripcion: "Cuentas y roles", soloAdmin: true, disponible: true },
];

/** ¿Puede este usuario ver el ítem? (Mis horarios solo para quien no ve todas las agendas). */
export function puedeVer(u: Usuario, i: ItemMenu): boolean {
  if (i.soloAdmin) return u.rol === "admin";
  if (i.href === "/panel/mis-horarios") return u.rol !== "admin" && tienePermiso(u, "asesorias.propias");
  if (i.permisos?.includes("*")) return true;
  return tienePermiso(u, ...(i.permisos ?? []));
}

export function menuParaUsuario(u: Usuario): ItemMenu[] {
  return MENU_PANEL.filter((i) => puedeVer(u, i));
}

/** Ítem del menú que corresponde a una ruta (la más específica). */
export function itemDeRuta(pathname: string): ItemMenu | undefined {
  return [...MENU_PANEL]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
}
