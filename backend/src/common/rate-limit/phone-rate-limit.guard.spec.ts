import { ExecutionContext, HttpException } from '@nestjs/common';
import { PhoneRateLimitGuard } from './phone-rate-limit.guard';

describe('PhoneRateLimitGuard', () => {
  let guard: PhoneRateLimitGuard;
  let redis: { incr: jest.Mock; expire: jest.Mock };

  const buildContext = (telefono?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          body: telefono ? { clienteTelefono: telefono } : {},
          route: { path: '/api/v1/carrito/solicitud' },
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    redis = { incr: jest.fn(), expire: jest.fn() };
    guard = new PhoneRateLimitGuard(redis as any);
  });

  it('permite pasar si no hay teléfono en el body (lo valida el DTO, no este guard)', async () => {
    await expect(guard.canActivate(buildContext(undefined))).resolves.toBe(true);
    expect(redis.incr).not.toHaveBeenCalled();
  });

  it('permite pasar mientras el conteo esté bajo el límite', async () => {
    redis.incr.mockResolvedValue(3);

    await expect(guard.canActivate(buildContext('+584121234567'))).resolves.toBe(
      true,
    );
  });

  it('setea el TTL solo en el primer request de la ventana', async () => {
    redis.incr.mockResolvedValue(1);

    await guard.canActivate(buildContext('+584121234567'));

    expect(redis.expire).toHaveBeenCalledWith(expect.any(String), 3600);
  });

  it('no vuelve a setear el TTL en requests subsecuentes', async () => {
    redis.incr.mockResolvedValue(2);

    await guard.canActivate(buildContext('+584121234567'));

    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('lanza 429 al superar el límite', async () => {
    redis.incr.mockResolvedValue(6);

    await expect(guard.canActivate(buildContext('+584121234567'))).rejects.toThrow(
      HttpException,
    );
  });

  it('usa una key distinta por endpoint, para no mezclar límites de carrito y asesorías', async () => {
    redis.incr.mockResolvedValue(1);
    const contextCarrito = {
      switchToHttp: () => ({
        getRequest: () => ({
          body: { clienteTelefono: '+584121234567' },
          route: { path: '/api/v1/carrito/solicitud' },
        }),
      }),
    } as unknown as ExecutionContext;

    await guard.canActivate(contextCarrito);

    expect(redis.incr).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/carrito/solicitud'),
    );
  });
});
