import { ConfiguracionService } from './configuracion.service';

const crear = (fila: unknown, env: Record<string, string> = {}) =>
  new ConfiguracionService(
    { findOne: jest.fn(async () => fila), save: jest.fn() } as any,
    { get: (k: string) => env[k] } as any,
  );

describe('ConfiguracionService.descuentoDivisasPct', () => {
  it('usa el valor guardado por el admin', async () => {
    expect(await crear({ valor: 12.5 }).descuentoDivisasPct()).toBe(12.5);
  });
  it('sin valor guardado cae al entorno y luego a 0', async () => {
    expect(await crear(null, { DESCUENTO_DIVISAS_PCT: '8' }).descuentoDivisasPct()).toBe(8);
    expect(await crear(null).descuentoDivisasPct()).toBe(0);
  });
  it('ignora un valor de entorno fuera de rango', async () => {
    expect(await crear(null, { DESCUENTO_DIVISAS_PCT: '150' }).descuentoDivisasPct()).toBe(0);
    expect(await crear(null, { DESCUENTO_DIVISAS_PCT: 'x' }).descuentoDivisasPct()).toBe(0);
  });
});

describe('ConfiguracionService.descuentoMetodos', () => {
  it('sin elección del admin valen efectivo en divisas y Zelle', async () => {
    expect(await crear(null).descuentoMetodos()).toEqual(['efectivo_divisas', 'zelle']);
  });
  it('usa los métodos elegidos (p. ej. con Binance) y descarta valores desconocidos', async () => {
    expect(await crear({ valor: ['zelle', 'binance', 'bitcoin'] }).descuentoMetodos()).toEqual(['zelle', 'binance']);
  });
  it('una lista vacía guardada significa que no aplica a ninguno', async () => {
    expect(await crear({ valor: [] }).descuentoMetodos()).toEqual([]);
  });
  it('al guardar quita duplicados', async () => {
    const repo = { findOne: jest.fn(), save: jest.fn() };
    const s = new ConfiguracionService(repo as any, { get: () => undefined } as any);
    expect(await s.fijarDescuentoMetodos(['binance', 'binance', 'zelle'] as any)).toEqual(['binance', 'zelle']);
  });
});
