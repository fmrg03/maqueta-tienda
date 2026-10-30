import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SolicitudCarrito } from '../../modules/carrito/entities/solicitud-carrito.entity';
import type { SolicitudAsesoria } from '../../modules/asesorias/entities/asesoria.entity';
import { CallMeBotService } from './callmebot.service';
import { EmailService } from './email.service';
import {
  mensajeDetalleCliente,
  mensajeNuevaSolicitudAsesoria,
  mensajeNuevaSolicitudCarrito,
  type DestinatarioAsesor,
} from './mensajes';

/**
 * Única puerta de entrada para avisar de nuevas solicitudes. Despacha a todos
 * los canales habilitados EN PARALELO e independientes: si uno falla (SMTP
 * caído, CallMeBot sin respuesta) los demás igual salen, y NUNCA se propaga
 * un error — el cliente ya tiene su solicitud guardada y no debe ver un 500
 * por una notificación que no salió.
 *
 * Los métodos devuelven la promesa del despacho para poder testearla, pero
 * los servicios la lanzan sin esperarla (`void`): el cliente no espera al SMTP.
 */
@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly callmebot: CallMeBotService,
  ) {}

  async notificarNuevaSolicitudCarrito(solicitud: SolicitudCarrito): Promise<void> {
    this.logger.log(`Nueva SolicitudCarrito ${solicitud.id}`);
    try {
      const mensaje = mensajeNuevaSolicitudCarrito(solicitud);
      const ventas = this.config.get<string>('VENTAS_EMAIL');

      await this.despachar([
        ['email', this.email.habilitado && ventas ? () => this.email.enviar(ventas, mensaje) : null],
        ['whatsapp', this.callmebot.habilitado ? () => this.callmebot.enviar(mensaje.texto) : null],
      ]);
    } catch (error) {
      this.logger.error(`No se pudo armar la notificación de carrito: ${String(error)}`);
    }
  }

  async notificarNuevaSolicitudAsesoria(
    solicitud: SolicitudAsesoria,
    asesor: DestinatarioAsesor | null,
  ): Promise<void> {
    this.logger.log(`Nueva SolicitudAsesoria ${solicitud.id}`);
    try {
      const mensaje = mensajeNuevaSolicitudAsesoria(solicitud, asesor ?? { nombre: '(sin asignar)', email: '' });

      await this.despachar([
        // Al asesor elegido por el cliente; si no hay correo del asesor, a ventas.
        [
          'email',
          this.email.habilitado
            ? this.destinoEmailAsesoria(asesor)
              ? () => this.email.enviar(this.destinoEmailAsesoria(asesor)!, mensaje)
              : null
            : null,
        ],
        ['whatsapp', this.callmebot.habilitado ? () => this.callmebot.enviar(mensaje.texto) : null],
      ]);
    } catch (error) {
      this.logger.error(`No se pudo armar la notificación de asesoría: ${String(error)}`);
    }
  }

  /**
   * Detalle editado para el cliente. A diferencia de las notificaciones
   * internas se espera (el asesor quiere saber si el correo salió), pero
   * igual nunca lanza: devuelve el texto (para el wa.me del asesor) y si
   * el correo pudo enviarse.
   */
  async enviarDetalleACliente(
    solicitud: SolicitudCarrito,
  ): Promise<{ texto: string; emailEnviado: boolean }> {
    const mensaje = mensajeDetalleCliente(solicitud);
    let emailEnviado = false;
    if (this.email.habilitado && solicitud.clienteEmail) {
      try {
        await this.email.enviar(solicitud.clienteEmail, mensaje);
        emailEnviado = true;
      } catch (error) {
        this.logger.error(`No se pudo enviar el detalle al cliente: ${String(error)}`);
      }
    }
    return { texto: mensaje.texto, emailEnviado };
  }

  private destinoEmailAsesoria(asesor: DestinatarioAsesor | null): string | null {
    return asesor?.email || this.config.get<string>('VENTAS_EMAIL') || null;
  }

  private async despachar(canales: Array<[string, (() => Promise<void>) | null]>): Promise<void> {
    const activos = canales.filter((c): c is [string, () => Promise<void>] => c[1] !== null);
    if (activos.length === 0) {
      this.logger.warn('Ningún canal de notificación configurado: la solicitud quedó solo en la base de datos');
      return;
    }
    const resultados = await Promise.allSettled(activos.map(([, enviar]) => enviar()));
    resultados.forEach((r, i) => {
      if (r.status === 'rejected') {
        this.logger.error(`Canal "${activos[i][0]}" falló: ${String(r.reason)}`);
      }
    });
  }
}
