import type { SolicitudCarrito, ItemSolicitudCarrito } from '../../modules/carrito/entities/solicitud-carrito.entity';
import type { SolicitudAsesoria } from '../../modules/asesorias/entities/asesoria.entity';

export interface MensajeNotificacion {
  asunto: string;
  texto: string;
  html: string;
  /** Si el cliente dejó correo, ventas/asesor puede responderle directo. */
  replyTo?: string;
}

export interface DestinatarioAsesor {
  nombre: string;
  email: string;
}

const ZONA_NEGOCIO = 'America/Caracas';

/** Los datos del cliente son texto libre: nunca van crudos a HTML ni a asuntos. */
export function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Una sola línea, sin caracteres de control (evita inyección de cabeceras). */
export function unaLinea(valor: string): string {
  // eslint-disable-next-line no-control-regex
  return valor.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
}

export function formatearFechaCaracas(fecha: Date): string {
  return new Intl.DateTimeFormat('es-VE', {
    timeZone: ZONA_NEGOCIO,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(fecha);
}

export function descripcionItem(item: ItemSolicitudCarrito): string {
  const cantidad = item.cantidad;
  if (item.combo) {
    return `${cantidad} × Combo: ${item.combo.nombre}`;
  }
  if (item.variante) {
    const v = item.variante;
    const nombre = v.material?.nombre ?? v.skuVariante;
    const presentacion = Object.values(v.atributos ?? {}).filter(Boolean).join(' · ');
    return `${cantidad} × ${nombre}${presentacion ? ` (${presentacion})` : ''} [${v.skuVariante}]`;
  }
  if (item.material) {
    return `${cantidad} × ${item.material.nombre} (cualquier presentación)`;
  }
  return `${cantidad} × (ítem sin referencia)`;
}

function envolverHtml(titulo: string, lineas: string[], items?: string[]): string {
  const filas = lineas.map((l) => `<p style="margin:4px 0">${l}</p>`).join('');
  const lista = items
    ? `<ul style="margin:8px 0;padding-left:20px">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`
    : '';
  return `<div style="font-family:Arial,sans-serif;font-size:14px;color:#171512"><h2 style="margin:0 0 12px">${titulo}</h2>${filas}${lista}</div>`;
}

export function mensajeNuevaSolicitudCarrito(s: SolicitudCarrito): MensajeNotificacion {
  const nombre = unaLinea(s.clienteNombre);
  const items = (s.items ?? []).map(descripcionItem);
  const datos = [
    `Cliente: ${nombre}`,
    `Teléfono: ${unaLinea(s.clienteTelefono)}`,
    ...(s.clienteEmail ? [`Correo: ${unaLinea(s.clienteEmail)}`] : []),
  ];

  const texto = [
    'Nueva consulta de cliente (carrito)',
    ...datos,
    'Ítems:',
    ...items.map((i) => `- ${i}`),
  ].join('\n');

  return {
    asunto: `Nueva consulta de ${nombre}`,
    texto,
    html: envolverHtml(
      'Nueva consulta de cliente',
      datos.map(escaparHtml),
      items.map(escaparHtml),
    ),
    replyTo: s.clienteEmail ? unaLinea(s.clienteEmail) : undefined,
  };
}

export function mensajeNuevaSolicitudAsesoria(
  s: SolicitudAsesoria,
  asesor: DestinatarioAsesor,
): MensajeNotificacion {
  const nombre = unaLinea(s.clienteNombre);
  const cuando = formatearFechaCaracas(new Date(s.fechaHoraLlamada));
  const datos = [
    `Asesor: ${unaLinea(asesor.nombre)}`,
    `Cliente: ${nombre}`,
    `Teléfono (WhatsApp): ${unaLinea(s.clienteTelefono)}`,
    ...(s.clienteEmail ? [`Correo: ${unaLinea(s.clienteEmail)}`] : []),
    `Llamada agendada: ${cuando} (hora de Venezuela)`,
  ];

  return {
    asunto: `Llamada agendada con ${nombre} — ${cuando}`,
    texto: ['Nueva llamada agendada', ...datos].join('\n'),
    html: envolverHtml('Nueva llamada agendada', datos.map(escaparHtml)),
    replyTo: s.clienteEmail ? unaLinea(s.clienteEmail) : undefined,
  };
}
