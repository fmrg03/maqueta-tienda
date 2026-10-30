import { TasasService } from './tasas.service';

const HORA = 3_600_000;

function crear(env: Record<string, string> = {}) {
  const filas: any[] = [];
  let n = 0;
  const repo: any = {
    findOne: jest.fn(async () => [...filas].sort((a, b) => b.createdAt - a.createdAt)[0] ?? null),
    create: jest.fn((x) => ({ createdAt: new Date(Date.now() + ++n), verificadaAt: new Date(), ...x })),
    save: jest.fn(async (x) => {
      filas.push(x);
      return x;
    }),
    update: jest.fn(async (_: any, cambios: any) => Object.assign(filas[filas.length - 1], cambios)),
    find: jest.fn(),
  };
  const service = new TasasService(repo, { get: (k: string) => env[k] } as any);
  return { service, repo, filas };
}

const respuesta = (promedio: unknown, ok = true) =>
  ({ ok, status: ok ? 200 : 500, json: async () => ({ promedio, fechaActualizacion: '2026-10-29T12:00:00Z' }) }) as any;

describe('TasasService', () => {
  const fetchOriginal = global.fetch;
  afterEach(() => {
    global.fetch = fetchOriginal;
  });

  it('obtiene y guarda la tasa la primera vez', async () => {
    global.fetch = jest.fn(async () => respuesta(301.37)) as any;
    const { service, filas } = crear();
    const t = await service.vigente();
    expect(t).toMatchObject({ valor: 301.37, fuente: 'bcv', desactualizada: false });
    expect(filas).toHaveLength(1);
  });

  it('no vuelve a consultar dentro del TTL', async () => {
    global.fetch = jest.fn(async () => respuesta(300)) as any;
    const { service } = crear();
    await service.vigente();
    await service.vigente();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('solo guarda una fila nueva cuando el valor cambia', async () => {
    global.fetch = jest.fn(async () => respuesta(300)) as any;
    const { service, filas } = crear({ TASA_BCV_TTL_MIN: '60' });
    await service.vigente();
    filas[0].verificadaAt = new Date(Date.now() - 2 * HORA);
    await service.vigente(); // mismo valor: solo confirma
    expect(filas).toHaveLength(1);

    filas[0].verificadaAt = new Date(Date.now() - 2 * HORA);
    global.fetch = jest.fn(async () => respuesta(305)) as any;
    const t = await service.vigente();
    expect(filas).toHaveLength(2);
    expect(t?.valor).toBe(305);
  });

  it('si la fuente falla usa la última tasa guardada; sin ninguna devuelve null', async () => {
    global.fetch = jest.fn(async () => { throw new Error('sin red'); }) as any;
    const vacio = crear();
    expect(await vacio.service.vigente()).toBeNull();

    const { service, filas } = crear();
    filas.push({ fuente: 'bcv', valor: 290, createdAt: new Date(Date.now() - 3 * HORA), verificadaAt: new Date(Date.now() - 3 * HORA) });
    const t = await service.vigente();
    expect(t?.valor).toBe(290);
    expect(t?.desactualizada).toBe(false);
  });

  it('marca desactualizada si hace más de 24 h que no se confirma', async () => {
    global.fetch = jest.fn(async () => respuesta(null)) as any;
    const { service, filas } = crear();
    filas.push({ fuente: 'bcv', valor: 290, createdAt: new Date(Date.now() - 30 * HORA), verificadaAt: new Date(Date.now() - 30 * HORA) });
    expect((await service.vigente())?.desactualizada).toBe(true);
  });

  it('ignora respuestas inválidas (promedio 0, texto o HTTP 500)', async () => {
    const { service, filas } = crear();
    for (const r of [respuesta(0), respuesta('abc'), respuesta(300, false)]) {
      global.fetch = jest.fn(async () => r) as any;
      await service.refrescar();
    }
    expect(filas).toHaveLength(0);
  });

  it('un valor manual manda 24 h sin consultar la fuente', async () => {
    global.fetch = jest.fn(async () => respuesta(300)) as any;
    const { service } = crear();
    await service.fijarManual(333);
    const t = await service.vigente();
    expect(t).toMatchObject({ valor: 333, fuente: 'manual' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('consultas simultáneas comparten una sola petición a la fuente', async () => {
    global.fetch = jest.fn(async () => respuesta(300)) as any;
    const { service } = crear();
    await Promise.all([service.vigente(), service.vigente(), service.vigente()]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
