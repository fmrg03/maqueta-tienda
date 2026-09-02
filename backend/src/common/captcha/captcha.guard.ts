import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verifica un token de Cloudflare Turnstile antes de dejar pasar la
 * request — pensado para /carrito/solicitud y /asesorias/solicitud (ver
 * ARCHITECTURE.md sección 5, "recomendado antes de producción").
 *
 * Deshabilitado por defecto (`CAPTCHA_ENABLED` sin setear o distinto de
 * 'true'): no tenemos todavía un sitio de Turnstile real, y activarlo a
 * ciegas rompería los flujos públicos sin que el frontend tenga el
 * widget integrado. Para activarlo en producción: crear un sitio en
 * Cloudflare Turnstile, setear CAPTCHA_ENABLED=true y
 * TURNSTILE_SECRET_KEY, y el frontend debe mandar el token del widget
 * en el campo `captchaToken` del body.
 */
@Injectable()
export class CaptchaGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.CAPTCHA_ENABLED !== 'true') {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token: string | undefined = request.body?.captchaToken;

    if (!token) {
      throw new BadRequestException('Falta el captcha');
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      // CAPTCHA_ENABLED=true sin la secret key es un error de
      // configuración del deploy, no algo que el cliente pueda arreglar.
      throw new InternalServerErrorException(
        'Captcha mal configurado en el servidor',
      );
    }

    const respuesta = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secretKey, response: token }),
    });
    const resultado = (await respuesta.json()) as { success: boolean };

    if (!resultado.success) {
      throw new BadRequestException('Captcha inválido');
    }

    return true;
  }
}
