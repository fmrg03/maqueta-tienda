import { ConfiguracionService } from './configuracion.service';

const crear = (fila: unknown) => new ConfiguracionService({ findOne: jest.fn(async () => fila), save: jest.fn() } as any);

describe('ConfiguracionService.reservaDias', () => {
  it('usa el valor guardado', async () => {
    expect(await crear({ valor: 10 }).reservaDias()).toBe(10);
  });
  it('sin valor (o inválido) vale 7', async () => {
    expect(await crear(null).reservaDias()).toBe(7);
    expect(await crear({ valor: 0 }).reservaDias()).toBe(7);
    expect(await crear({ valor: 'x' }).reservaDias()).toBe(7);
  });
});
