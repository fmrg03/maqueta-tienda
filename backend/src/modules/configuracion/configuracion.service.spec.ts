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
