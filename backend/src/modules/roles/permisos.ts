/**
 * Catálogo de permisos del panel. Cada permiso es una capacidad concreta;
 * los roles son conjuntos de permisos. `X.gestionar` incluye `X.ver`.
 *
 * Solo el rol `admin` administra usuarios, roles y permisos: eso NO es un
 * permiso asignable (se valida por rol) para que nadie pueda delegarlo.
 */
export interface PermisoDef {
  clave: string;
  etiqueta: string;
  grupo: string;
}

export const CATALOGO_PERMISOS: PermisoDef[] = [
  { clave: 'solicitudes.ver', etiqueta: 'Ver solicitudes de carrito y reservas', grupo: 'Ventas' },
  { clave: 'solicitudes.gestionar', etiqueta: 'Gestionar pedidos: cobrar, abonar, cerrar, cancelar', grupo: 'Ventas' },
  { clave: 'presupuestos.ver', etiqueta: 'Ver presupuestos', grupo: 'Presupuestos' },
  { clave: 'presupuestos.gestionar', etiqueta: 'Crear, editar y enviar presupuestos', grupo: 'Presupuestos' },
  { clave: 'presupuestos.convertir', etiqueta: 'Convertir presupuesto en pedido', grupo: 'Presupuestos' },
  { clave: 'presupuestos.eliminar', etiqueta: 'Eliminar presupuestos', grupo: 'Presupuestos' },
  { clave: 'servicios.ver', etiqueta: 'Ver catálogo de servicios', grupo: 'Presupuestos' },
  { clave: 'servicios.gestionar', etiqueta: 'Crear y editar servicios', grupo: 'Presupuestos' },
  { clave: 'asesorias.propias', etiqueta: 'Atender sus propias asesorías y horarios', grupo: 'Asesorías' },
  { clave: 'asesorias.todas', etiqueta: 'Ver y gestionar las asesorías de todos', grupo: 'Asesorías' },
  { clave: 'inventario.ver', etiqueta: 'Ver materiales, combos, movimientos y costos', grupo: 'Inventario' },
  { clave: 'inventario.gestionar', etiqueta: 'Crear/editar materiales, combos, movimientos e importar', grupo: 'Inventario' },
  { clave: 'proveedores.ver', etiqueta: 'Ver proveedores', grupo: 'Inventario' },
  { clave: 'proveedores.gestionar', etiqueta: 'Crear y editar proveedores', grupo: 'Inventario' },
  { clave: 'reportes.ver', etiqueta: 'Ver y exportar reportes', grupo: 'Finanzas' },
  { clave: 'tasas.gestionar', etiqueta: 'Actualizar la tasa BCV', grupo: 'Finanzas' },
  { clave: 'configuracion.ver', etiqueta: 'Ver configuración', grupo: 'Sistema' },
  { clave: 'configuracion.gestionar', etiqueta: 'Cambiar configuración', grupo: 'Sistema' },
];

export const CLAVES_PERMISOS = new Set(CATALOGO_PERMISOS.map((p) => p.clave));

/** Roles que siempre existen. `admin` es inmutable y tiene todos los permisos. */
export const ROL_ADMIN = 'admin';
export const ROL_CLIENTE = 'cliente';

export interface RolSistemaDef {
  clave: string;
  nombre: string;
  descripcion: string;
  permisos: string[];
}

export const ROLES_SISTEMA: RolSistemaDef[] = [
  {
    clave: 'ventas',
    nombre: 'Ventas',
    descripcion: 'Atiende pedidos, cobros, abonos y presupuestos',
    permisos: [
      'solicitudes.gestionar', 'presupuestos.gestionar', 'presupuestos.convertir',
      'presupuestos.eliminar', 'servicios.ver', 'configuracion.ver',
    ],
  },
  {
    clave: 'asesor',
    nombre: 'Asesor',
    descripcion: 'Atiende sus asesorías y arma presupuestos',
    permisos: ['asesorias.propias', 'presupuestos.gestionar', 'servicios.ver'],
  },
  {
    clave: 'almacen',
    nombre: 'Almacén / inventario',
    descripcion: 'Administra materiales, movimientos, combos y proveedores',
    permisos: ['inventario.gestionar', 'proveedores.gestionar'],
  },
  {
    clave: 'contabilidad',
    nombre: 'Contabilidad / finanzas',
    descripcion: 'Consulta reportes, ventas, presupuestos e inventario',
    permisos: [
      'reportes.ver', 'solicitudes.ver', 'presupuestos.ver', 'inventario.ver',
      'proveedores.ver', 'configuracion.ver',
    ],
  },
];

/** `gestionar` implica `ver` del mismo recurso. */
export function expandirPermisos(permisos: string[]): string[] {
  const set = new Set(permisos);
  for (const p of permisos) {
    if (p.endsWith('.gestionar')) set.add(p.replace('.gestionar', '.ver'));
  }
  return [...set].sort();
}

export function todosLosPermisos(): string[] {
  return CATALOGO_PERMISOS.map((p) => p.clave).sort();
}
