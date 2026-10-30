import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CombosService } from './combos.service';

function crear() {
  const manager: any = { delete: jest.fn(), save: jest.fn().mockImplementation((_e, x) => Promise.resolve(x)) };
  manager.transaction = jest.fn((cb: any) => cb(manager));
  const comboRepo: any = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((x) => x),
    save: jest.fn((x) => Promise.resolve({ ...x, id: 'c1' })),
    manager,
  };
  const varRepo: any = { find: jest.fn() };
  return { service: new CombosService(comboRepo, varRepo), comboRepo, varRepo, manager };
}

describe('CombosService', () => {
  it('rechaza presentaciones repetidas y variantes inexistentes', async () => {
    const { service, varRepo } = crear();
    await expect(
      service.create({ nombre: 'X', precioCombo: 1, items: [{ varianteId: 'a', cantidad: 1 }, { varianteId: 'a', cantidad: 2 }] }),
    ).rejects.toThrow(BadRequestException);
    varRepo.find.mockResolvedValue([]);
    await expect(
      service.create({ nombre: 'X', precioCombo: 1, items: [{ varianteId: 'a', cantidad: 1 }] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('findAll filtra por estado', async () => {
    const { service, comboRepo } = crear();
    await service.findAll('inactivos');
    expect(comboRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: { activo: false } }));
    await service.findAll('todos');
    expect(comboRepo.find).toHaveBeenLastCalledWith(expect.objectContaining({ where: {} }));
  });

  it('update reemplaza los ítems en una transacción y no toca lo que no viene', async () => {
    const { service, comboRepo, varRepo, manager } = crear();
    comboRepo.findOne.mockResolvedValue({ id: 'c1', nombre: 'Viejo', precioCombo: 10, activo: true, items: [] });
    varRepo.find.mockResolvedValue([{ id: 'v1' }, { id: 'v2' }]);

    await service.update('c1', { precioCombo: 12, items: [{ varianteId: 'v1', cantidad: 2 }, { varianteId: 'v2', cantidad: 1 }] });

    expect(manager.delete).toHaveBeenCalledTimes(1);
    const guardadoItems = manager.save.mock.calls.find((c: any[]) => Array.isArray(c[1]))[1];
    expect(guardadoItems).toHaveLength(2);
    expect(guardadoItems[0].combo).toEqual({ id: 'c1' });
    const guardadoCombo = manager.save.mock.calls.find((c: any[]) => !Array.isArray(c[1]))[1];
    expect(guardadoCombo).toMatchObject({ nombre: 'Viejo', precioCombo: 12, activo: true });
    expect(guardadoCombo.items).toBeUndefined();
  });

  it('update sin items no borra los existentes', async () => {
    const { service, comboRepo, manager } = crear();
    comboRepo.findOne.mockResolvedValue({ id: 'c1', nombre: 'A', precioCombo: 10, activo: true, items: [{ id: 'i' }] });
    await service.update('c1', { activo: false });
    expect(manager.delete).not.toHaveBeenCalled();
  });
});
