import { ConfigService } from '@nestjs/config';
import { CallMeBotService } from './callmebot.service';
import { EmailService } from './email.service';
import { escaparHtml, mensajeAsesoriaCliente, mensajeNuevaSolicitudAsesoria, mensajeNuevaSolicitudCarrito, unaLinea } from './mensajes';
import { NotificacionesService } from './notificaciones.service';

const sendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail })),
}));

const cfg = (valores: Record<string, string>) =>
  ({ get: (k: string) => valores[k] }) as unknown as ConfigService;

const carrito: any = {
  id: 'sol-1',
  clienteNombre: 'Maria <script>alert(1)</script>\r\nBcc: evil@x.com',
  clienteTelefono: '+584141234567',
  clienteEmail: 'maria@example.com',
  items: [
    { cantidad: 2, variante: { skuVariante: 'CEM-25', atributos: { presentacion: '25kg' }, precioVenta: '8.00', material: { nombre: 'Cemento Gris' } } },
    { cantidad: 1, combo: { nombre: 'Combo Obra Gris', precioCombo: '14.00' } },
    { cantidad: 3, material: { nombre: 'Porcelanato' } },
  ],
};

const asesoria: any = {
  id: 'ase-1',
  clienteNombre: 'Pedro',
  clienteTelefono: '+584245551234',
  fechaHoraLlamada: new Date('2026-10-30T18:00:00Z'),
};

describe('mensajes', () => {
  it('escapa HTML y no deja saltos de línea en el asunto (sin inyección)', () => {
    const m = mensajeNuevaSolicitudCarrito(carrito);
    expect(m.html).not.toContain('<script>');
    expect(m.html).toContain('&lt;script&gt;');
    expect(m.asunto).not.toMatch(/[\r\n]/);
    expect(unaLinea('a\r\nb')).toBe('a b');
    expect(escaparHtml(`<&"'>`)).toBe('&lt;&amp;&quot;&#39;&gt;');
  });

  it('describe cada tipo de ítem (variante, combo, material)', () => {
    const { texto } = mensajeNuevaSolicitudCarrito(carrito);
    expect(texto).toContain('2 × Cemento Gris (25kg) [CEM-25] — $8.00 c/u = $16.00');
    expect(texto).toContain('1 × Combo: Combo Obra Gris — $14.00 c/u = $14.00');
    expect(texto).toContain('3 × Porcelanato (cualquier presentación) — precio a confirmar');
  });

  it('incluye el total de referencia, marcado parcial si hay ítems sin precio', () => {
    const m = mensajeNuevaSolicitudCarrito(carrito);
    expect(m.texto).toContain('Total de referencia: $30.00 (parcial: hay ítems con precio a confirmar)');
    expect(m.html).toContain('Total de referencia: $30.00');

    const completo = mensajeNuevaSolicitudCarrito({ ...carrito, items: carrito.items.slice(0, 2) });
    expect(completo.texto).toContain('Total de referencia: $30.00');
    expect(completo.texto).not.toContain('parcial');
  });

  it('la llamada se muestra en hora de Venezuela (18:00Z = 2:00 p. m.)', () => {
    const m = mensajeNuevaSolicitudAsesoria(asesoria, { nombre: 'Ana', email: 'ana@x.com' });
    expect(m.texto).toMatch(/2:00\s?p\.\s?m\./);
    expect(m.texto).toContain('Asesor: Ana');
  });
});

describe('EmailService', () => {
  beforeEach(() => sendMail.mockReset());

  it('sin SMTP_HOST queda deshabilitado y no envía', async () => {
    const e = new EmailService(cfg({}));
    expect(e.habilitado).toBe(false);
    await e.enviar('a@x.com', { asunto: 's', texto: 't', html: 'h' });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('envía al destinatario con reply-to del cliente', async () => {
    const e = new EmailService(cfg({ SMTP_HOST: 'smtp.x', SMTP_USER: 'u@x.com' }));
    await e.enviar('ventas@x.com', { asunto: 'Hola', texto: 't', html: 'h', replyTo: 'c@x.com' });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ventas@x.com', from: 'u@x.com', subject: 'Hola', replyTo: 'c@x.com' }),
    );
  });

  it('con OVERRIDE redirige todo a esa dirección y marca el asunto', async () => {
    const e = new EmailService(cfg({ SMTP_HOST: 'smtp.x', NOTIFICACIONES_EMAIL_OVERRIDE: 'yo@x.com' }));
    await e.enviar('asesor-real@x.com', { asunto: 'Llamada', texto: 't', html: 'h' });
    const arg = sendMail.mock.calls[0][0];
    expect(arg.to).toBe('yo@x.com');
    expect(arg.subject).toBe('[PRUEBA → asesor-real@x.com] Llamada');
  });
});

describe('CallMeBotService', () => {
  const fetchOriginal = global.fetch;
  afterEach(() => { global.fetch = fetchOriginal; });

  it('deshabilitado sin phone/apikey', async () => {
    global.fetch = jest.fn() as any;
    const c = new CallMeBotService(cfg({ CALLMEBOT_PHONE: '584225644299' }));
    expect(c.habilitado).toBe(false);
    await c.enviar('hola');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('llama a la API con phone limpio, texto codificado y apikey', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 }) as any;
    const c = new CallMeBotService(cfg({ CALLMEBOT_PHONE: '+58 422-5644299', CALLMEBOT_APIKEY: 'k123' }));
    await c.enviar('Hola mundo & más');
    const url = new URL((global.fetch as jest.Mock).mock.calls[0][0]);
    expect(url.searchParams.get('phone')).toBe('584225644299');
    expect(url.searchParams.get('text')).toBe('Hola mundo & más');
    expect(url.searchParams.get('apikey')).toBe('k123');
  });

  it('si la API responde error, lanza SIN incluir la apikey en el mensaje', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as any;
    const c = new CallMeBotService(cfg({ CALLMEBOT_PHONE: '584225644299', CALLMEBOT_APIKEY: 'secreta' }));
    await expect(c.enviar('x')).rejects.toThrow(/HTTP 500/);
    await expect(c.enviar('x')).rejects.not.toThrow(/secreta/);
  });
});

describe('NotificacionesService', () => {
  const armar = (email: Partial<EmailService>, bot: Partial<CallMeBotService>, env: Record<string, string> = {}) =>
    new NotificacionesService(cfg(env), email as EmailService, bot as CallMeBotService);

  it('carrito: manda email a VENTAS_EMAIL y WhatsApp, ambos', async () => {
    const enviarEmail = jest.fn().mockResolvedValue(undefined);
    const enviarWa = jest.fn().mockResolvedValue(undefined);
    const n = armar(
      { habilitado: true, enviar: enviarEmail } as any,
      { habilitado: true, enviar: enviarWa } as any,
      { VENTAS_EMAIL: 'ventas@x.com' },
    );
    await n.notificarNuevaSolicitudCarrito(carrito);
    expect(enviarEmail).toHaveBeenCalledWith('ventas@x.com', expect.objectContaining({ asunto: expect.any(String) }));
    expect(enviarWa).toHaveBeenCalledWith(expect.stringContaining('Cemento Gris'));
  });

  it('si el email falla, WhatsApp igual sale y NO se lanza error', async () => {
    const enviarWa = jest.fn().mockResolvedValue(undefined);
    const n = armar(
      { habilitado: true, enviar: jest.fn().mockRejectedValue(new Error('SMTP caído')) } as any,
      { habilitado: true, enviar: enviarWa } as any,
      { VENTAS_EMAIL: 'ventas@x.com' },
    );
    await expect(n.notificarNuevaSolicitudCarrito(carrito)).resolves.toBeUndefined();
    expect(enviarWa).toHaveBeenCalled();
  });

  it('asesoría: el email va al asesor elegido; sin correo de asesor, a ventas', async () => {
    const enviarEmail = jest.fn().mockResolvedValue(undefined);
    const n = armar({ habilitado: true, enviar: enviarEmail } as any, { habilitado: false } as any, { VENTAS_EMAIL: 'ventas@x.com' });

    await n.notificarNuevaSolicitudAsesoria(asesoria, { nombre: 'Ana', email: 'ana@x.com' });
    expect(enviarEmail).toHaveBeenLastCalledWith('ana@x.com', expect.anything());

    await n.notificarNuevaSolicitudAsesoria(asesoria, null);
    expect(enviarEmail).toHaveBeenLastCalledWith('ventas@x.com', expect.anything());
  });

  it('sin ningún canal configurado no falla (solo advierte)', async () => {
    const n = armar({ habilitado: false } as any, { habilitado: false } as any);
    await expect(n.notificarNuevaSolicitudCarrito(carrito)).resolves.toBeUndefined();
  });
});

describe('mensajeAsesoriaCliente', () => {
  it('distingue agendada de reagendada y escapa el nombre', () => {
    const a = { ...asesoria, clienteNombre: 'Pedro <b>x</b>' };
    const nueva = mensajeAsesoriaCliente(a, 'Ana', false);
    const re = mensajeAsesoriaCliente(a, 'Ana', true);
    expect(nueva.asunto).toContain('agendada');
    expect(re.asunto).toContain('reagendada');
    expect(re.texto).toContain('Nueva fecha');
    expect(re.html).not.toContain('<b>');
    expect(re.asunto).not.toMatch(/[\r\n]/);
  });
});
