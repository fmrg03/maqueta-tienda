import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { unaLinea, type MensajeNotificacion } from './mensajes';

/**
 * Envío de correo por SMTP (Gmail, Zoho, Resend, SES… cualquiera).
 *
 * Variables de entorno:
 *   SMTP_HOST, SMTP_PORT (587), SMTP_SECURE (true solo para el 465),
 *   SMTP_USER, SMTP_PASS, MAIL_FROM (por defecto SMTP_USER).
 *   NOTIFICACIONES_EMAIL_OVERRIDE: si está definido, TODO correo se redirige
 *   a esa dirección (para pruebas: nunca le llega a un asesor real).
 *
 * Sin SMTP_HOST el canal queda deshabilitado (no es un error).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly override: string | null;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const user = config.get<string>('SMTP_USER');
    this.from = config.get<string>('MAIL_FROM') || user || 'no-reply@localhost';
    this.override = config.get<string>('NOTIFICACIONES_EMAIL_OVERRIDE') || null;

    this.transporter = host
      ? createTransport({
          host,
          port: Number(config.get('SMTP_PORT') ?? 587),
          secure: config.get('SMTP_SECURE') === 'true',
          auth: user ? { user, pass: config.get<string>('SMTP_PASS') } : undefined,
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 15_000,
        })
      : null;
  }

  get habilitado(): boolean {
    return this.transporter !== null;
  }

  async enviar(para: string, mensaje: MensajeNotificacion): Promise<void> {
    if (!this.transporter) return;

    const destino = this.override ?? para;
    const asunto = this.override
      ? `[PRUEBA → ${unaLinea(para)}] ${mensaje.asunto}`
      : mensaje.asunto;

    await this.transporter.sendMail({
      from: this.from,
      to: destino,
      subject: unaLinea(asunto),
      text: mensaje.texto,
      html: mensaje.html,
      replyTo: mensaje.replyTo,
    });
    this.logger.log(`Correo enviado a ${destino}: "${unaLinea(asunto)}"`);
  }
}
