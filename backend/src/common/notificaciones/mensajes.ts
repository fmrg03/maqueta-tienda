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

export function dinero(valor: number): string {
  return `$${valor.toFixed(2)}`;
}

export interface LineaItem {
  /** "2 × Cemento Gris (25kg) [CEM-25] — $8.00 c/u = $16.00" */
  texto: string;
  /** null si el ítem no tiene precio definido (material sin presentación elegida). */
  subtotal: number | null;
}

// Los decimales de Postgres llegan como string ("8.00"): se convierten acá.
export function lineaItem(item: ItemSolicitudCarrito): LineaItem {
  const cantidad = item.cantidad;
  let nombre: string;
  let unitario: number | null = null;

  // Precio pactado (editable por el asesor) y, si no hay, el de lista.
  const pactado = item.precioUnitario;
  const hayPactado = pactado !== null && pactado !== undefined && !Number.isNaN(Number(pactado));

  if (item.combo) {
    nombre = `Combo: ${item.combo.nombre}`;
    unitario = hayPactado ? Number(pactado) : Number(item.combo.precioCombo);
  } else if (item.variante) {
    const v = item.variante;
    const presentacion = Object.values(v.atributos ?? {}).filter(Boolean).join(' · ');
    nombre = `${v.material?.nombre ?? v.skuVariante}${presentacion ? ` (${presentacion})` : ''} [${v.skuVariante}]`;
    unitario = hayPactado ? Number(pactado) : Number(v.precioVenta);
  } else if (item.material) {
    nombre = `${item.material.nombre} (cualquier presentación)`;
    if (hayPactado) unitario = Number(pactado);
  } else {
    nombre = '(ítem sin referencia)';
  }

  if (unitario === null || Number.isNaN(unitario)) {
    return { texto: `${cantidad} × ${nombre} — precio a confirmar`, subtotal: null };
  }
  const subtotal = unitario * cantidad;
  return {
    texto: `${cantidad} × ${nombre} — ${dinero(unitario)} c/u = ${dinero(subtotal)}`,
    subtotal,
  };
}

/** Total de referencia; `parcial` si algún ítem no tiene precio todavía. */
export function totalCarrito(items: LineaItem[]): { total: number; parcial: boolean } {
  return {
    total: items.reduce((s, i) => s + (i.subtotal ?? 0), 0),
    parcial: items.some((i) => i.subtotal === null),
  };
}

function envolverHtml(titulo: string, lineas: string[], items?: string[], pie?: string): string {
  const filas = lineas.map((l) => `<p style="margin:4px 0">${l}</p>`).join('');
  const lista = items
    ? `<ul style="margin:8px 0;padding-left:20px">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`
    : '';
  const cierre = pie ? `<p style="margin:8px 0">${pie}</p>` : '';
  return `<div style="font-family:Arial,sans-serif;font-size:14px;color:#171512"><h2 style="margin:0 0 12px">${titulo}</h2>${filas}${lista}${cierre}</div>`;
}

export function mensajeNuevaSolicitudCarrito(s: SolicitudCarrito): MensajeNotificacion {
  const nombre = unaLinea(s.clienteNombre);
  const lineas = (s.items ?? []).map(lineaItem);
  const items = lineas.map((l) => l.texto);
  const { total, parcial } = totalCarrito(lineas);
  const lineaTotal = `Total de referencia: ${dinero(total)}${parcial ? ' (parcial: hay ítems con precio a confirmar)' : ''}`;
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
    lineaTotal,
  ].join('\n');

  return {
    asunto: `Nueva consulta de ${nombre}`,
    texto,
    html: envolverHtml(
      'Nueva consulta de cliente',
      datos.map(escaparHtml),
      items.map(escaparHtml),
      `<strong>${escaparHtml(lineaTotal)}</strong>`,
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

/** Detalle del pedido (ya editado por el asesor) para reenviarle al cliente. */
export function mensajeDetalleCliente(s: SolicitudCarrito): MensajeNotificacion {
  const nombre = unaLinea(s.clienteNombre);
  const lineas = (s.items ?? []).map(lineaItem);
  const items = lineas.map((l) => l.texto);
  const { total, parcial } = totalCarrito(lineas);
  const fijo = s.totalFinal !== null && s.totalFinal !== undefined ? Number(s.totalFinal) : null;
  const lineaTotal =
    fijo !== null
      ? `Total acordado: ${dinero(fijo)}`
      : `Total: ${dinero(total)}${parcial ? ' (parcial: hay ítems con precio por confirmar)' : ''}`;
  const saludo = `Hola ${nombre}, este es el detalle actualizado de tu pedido en Revestimiento Élite RY:`;
  const cierre = 'Si estás de acuerdo, respóndenos para continuar con el pago.';

  return {
    asunto: 'Detalle actualizado de tu pedido — Revestimiento Élite RY',
    texto: [saludo, ...items.map((i) => `- ${i}`), lineaTotal, cierre].join('\n'),
    html: envolverHtml(
      'Detalle actualizado de tu pedido',
      [escaparHtml(saludo)],
      items.map(escaparHtml),
      `<strong>${escaparHtml(lineaTotal)}</strong><br>${escaparHtml(cierre)}`,
    ),
  };
}
