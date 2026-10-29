import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * WhatsApp vía CallMeBot (https://www.callmebot.com/blog/free-api-whatsapp-messages/).
 * Servicio gratuito pensado para PRUEBAS con un número personal: el dueño del
 * número debe autorizar al bot una vez y recibe una apikey. Para producción
 * se reemplaza por WhatsApp Cloud API (Meta) o Twilio detrás de la misma
 * interfaz (`enviar(texto)`).
 *
 * Variables: CALLMEBOT_PHONE (con código de país, ej. 584225644299) y
 * CALLMEBOT_APIKEY. Sin ambas, el canal queda deshabilitado.
 */
@Injectable()
export class CallMeBotService {
  private readonly logger = new Logger(CallMeBotService.name);
  private readonly phone: string;
  private readonly apikey: string;

  constructor(config: ConfigService) {
    this.phone = (config.get<string>('CALLMEBOT_PHONE') ?? '').replace(/\D/g, '');
    this.apikey = config.get<string>('CALLMEBOT_APIKEY') ?? '';
  }

  get habilitado(): boolean {
    return Boolean(this.phone && this.apikey);
  }

  async enviar(texto: string): Promise<void> {
    if (!this.habilitado) return;

    const params = new URLSearchParams({
      phone: this.phone,
      text: texto,
      apikey: this.apikey,
    });
    const respuesta = await fetch(`https://api.callmebot.com/whatsapp.php?${params}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!respuesta.ok) {
      // No se loguea la URL: lleva la apikey.
      throw new Error(`CallMeBot respondió HTTP ${respuesta.status}`);
    }
    this.logger.log(`WhatsApp (CallMeBot) enviado a +${this.phone}`);
  }
}
