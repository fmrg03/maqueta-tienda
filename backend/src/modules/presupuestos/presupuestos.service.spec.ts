import { BadRequestException, ConflictException } from '@nestjs/common';
import { PresupuestosService } from './presupuestos.service';

const crearServicio = (presupuesto: any, extra: { carrito?: any; repoItems?: any; manager?: any } = {}) => {
  const repo = {
    findOne: jest.fn(async () => presupuesto),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn((x) => x),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const repoItems = extra.repoItems ?? { delete: jest.fn(), insert: jest.fn() };
  const manager = extra.manager ?? {
    getRepository: jest.fn(() => repoItems),
    query: jest.fn(async () => [{ numero: 7 }]),
  };
  const carrito = extra.carrito ?? { crearDesdePresupuesto: jest.fn(async () => ({ id: 'sol-1', numero: 7 })) };
  const s = new PresupuestosService(
    repo as any,
    { manager } as any,
    { vigente: jest.fn(async () => ({ valor: 300 })) } as any,
    carrito as any,
    { get: () => undefined } as any,
  );
  return { s, repo, carrito, manager, repoItems };
};

const base = (extra: Record<string, unknown> = {}) => ({
  id: 'p1',
  numero: 12,
  estado: 'aprobado',
  clienteNombre: 'Ana',
  clienteTelefono: '04141234567',
  descuentoPct: 0,
  validezDias: 15,
  items: [
    { orden: 0, tipo: 'producto', varianteId: 'v1', descripcion: 'Cemento', unidad: 'unidad', cantidad: 10, precioUnitario: 8 },
    { orden: 1, tipo: 'servicio', descripcion: 'Pegado', unidad: 'm²', cantidad: 12.5, precioUnitario: 6.4 },
  ],
  ...extra,
});

describe('PresupuestosService.convertir', () => {
  it('pasa productos, combos y servicios al carrito con el precio del presupuesto', async () => {
    const { s, carrito, repo } = crearServicio(base());
    const r = await s.convertir('p1', 'u1');
    expect(r).toEqual({ solicitudId: 'sol-1', numeroSolicitud: 7 });
    const arg = carrito.crearDesdePresupuesto.mock.calls[0][0];
    expect(arg.items).toEqual([{ varianteId: 'v1', comboId: undefined, cantidad: 10, precioUnitario: 8, precioDivisasUnitario: null }]);
    expect(arg.servicios).toEqual([{ servicioId: undefined, descripcion: 'Pegado', unidad: 'm²', cantidad: 12.5, precioUnitario: 6.4 }]);
    expect(arg.totalFinal).toBeNull();
    expect(repo.update).toHaveBeenCalledWith({ id: 'p1' }, expect.objectContaining({ estado: 'convertido', solicitudId: 'sol-1' }));
  });

  it('con descuento fija el total final de productos y servicios', async () => {
    const { s, carrito } = crearServicio(base({ descuentoPct: 10 }));
    await s.convertir('p1');
    expect(carrito.crearDesdePresupuesto.mock.calls[0][0].totalFinal).toBe(144);
  });

  it('exige que esté aprobado', async () => {
    const { s } = crearServicio(base({ estado: 'enviado' }));
    await expect(s.convertir('p1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('no convierte dos veces', async () => {
    const { s } = crearServicio(base({ estado: 'convertido' }));
    await expect(s.convertir('p1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('exige teléfono del cliente', async () => {
    const { s } = crearServicio(base({ clienteTelefono: null }));
    await expect(s.convertir('p1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('convierte un presupuesto de solo servicios (sin productos)', async () => {
    const { s, carrito } = crearServicio(base({ items: [base().items[1]] }));
    await s.convertir('p1');
    const arg = carrito.crearDesdePresupuesto.mock.calls[0][0];
    expect(arg.items).toEqual([]);
    expect(arg.servicios).toHaveLength(1);
  });

  it('rechaza un presupuesto sin líneas', async () => {
    const { s } = crearServicio(base({ items: [] }));
    await expect(s.convertir('p1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('avisa si un producto ya no existe en el catálogo', async () => {
    const { s } = crearServicio(base({ items: [{ ...base().items[0], varianteId: null }] }));
    await expect(s.convertir('p1')).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('PresupuestosService.actualizar / líneas', () => {
  it('no deja modificar un presupuesto convertido', async () => {
    const { s } = crearServicio(base({ estado: 'convertido' }));
    await expect(
      s.actualizar('p1', { clienteNombre: 'Ana', items: [] } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('un servicio libre necesita descripción y precio', async () => {
    const { s } = crearServicio(base({ estado: 'borrador' }));
    await expect(
      s.actualizar('p1', { clienteNombre: 'Ana', items: [{ tipo: 'servicio', cantidad: 1, precioUnitario: 5 }] } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      s.actualizar('p1', { clienteNombre: 'Ana', items: [{ tipo: 'servicio', descripcion: 'Demolición', cantidad: 1 }] } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('los productos deben tener cantidad entera', async () => {
    const { s } = crearServicio(base({ estado: 'borrador' }));
    await expect(
      s.actualizar('p1', { clienteNombre: 'Ana', items: [{ tipo: 'producto', varianteId: 'v1', cantidad: 1.5 }] } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('PresupuestosService.enviar', () => {
  it('no envía un presupuesto vacío', async () => {
    const { s } = crearServicio(base({ estado: 'borrador', items: [] }));
    await expect(s.enviar('p1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('arma el mensaje con el total y el enlace, y marca enviado', async () => {
    const manager = { getRepository: jest.fn(), query: jest.fn(async () => [{ token: 'tok-123' }]) };
    const { s, repo } = crearServicio(base({ estado: 'borrador' }), { manager });
    const r = await s.enviar('p1');
    expect(r.mensaje).toContain('N° 0012');
    expect(r.mensaje).toContain('$160.00');
    expect(r.mensaje).toContain('/api/v1/presupuesto-publico/tok-123/pdf');
    expect(r.estado).toBe('enviado');
    expect(repo.update).toHaveBeenCalledWith({ id: 'p1' }, expect.objectContaining({ estado: 'enviado' }));
  });
});
