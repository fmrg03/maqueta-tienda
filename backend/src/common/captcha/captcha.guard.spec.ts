import { BadRequestException, ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import { CaptchaGuard } from './captcha.guard';

describe('CaptchaGuard', () => {
  let guard: CaptchaGuard;
  const envOriginal = process.env;

  const buildContext = (body: Record<string, unknown> = {}): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ body }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    guard = new CaptchaGuard();
    process.env = { ...envOriginal };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = envOriginal;
    jest.restoreAllMocks();
  });

  it('deja pasar sin verificar nada cuando CAPTCHA_ENABLED no está en "true"', async () => {
    delete process.env.CAPTCHA_ENABLED;

    await expect(guard.canActivate(buildContext())).resolves.toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('lanza BadRequestException si está habilitado y falta el token', async () => {
    process.env.CAPTCHA_ENABLED = 'true';
    process.env.TURNSTILE_SECRET_KEY = 'secret-de-prueba';

    await expect(guard.canActivate(buildContext({}))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lanza InternalServerErrorException si está habilitado sin secret key configurada', async () => {
    process.env.CAPTCHA_ENABLED = 'true';
    delete process.env.TURNSTILE_SECRET_KEY;

    await expect(
      guard.canActivate(buildContext({ captchaToken: 'token-123' })),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('deja pasar si Turnstile confirma el token como válido', async () => {
    process.env.CAPTCHA_ENABLED = 'true';
    process.env.TURNSTILE_SECRET_KEY = 'secret-de-prueba';
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });

    await expect(
      guard.canActivate(buildContext({ captchaToken: 'token-valido' })),
    ).resolves.toBe(true);
  });

  it('lanza BadRequestException si Turnstile rechaza el token', async () => {
    process.env.CAPTCHA_ENABLED = 'true';
    process.env.TURNSTILE_SECRET_KEY = 'secret-de-prueba';
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: false }),
    });

    await expect(
      guard.canActivate(buildContext({ captchaToken: 'token-invalido' })),
    ).rejects.toThrow(BadRequestException);
  });
});
