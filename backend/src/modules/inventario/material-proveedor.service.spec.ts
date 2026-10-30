import { ConflictException, NotFoundException } from '@nestjs/common';
import { MaterialProveedorService } from './material-proveedor.service';

const repo = () => ({ findOne: jest.fn(), find: jest.fn(), create: jest.fn((x) => x), save: jest.fn((x) => Promise.resolve(x)), delete: jest.fn() });

describe('MaterialProveedorService', () => {
  let mp: ReturnType<typeof repo>, va: ReturnType<typeof repo>, pr: ReturnType<typeof repo>;
  let service: MaterialProveedorService;

  beforeEach(() => {
    mp = repo(); va = repo(); pr = repo();
    service = new MaterialProveedorService(mp as any, va as any, pr as any);
  });

  it('asociar rechaza duplicados con 409', async () => {
    va.findOne.mockResolvedValue({ id: 'v' });
    pr.findOne.mockResolvedValue({ id: 'p' });
    mp.findOne.mockResolvedValue({ id: 'a' });
    await expect(service.asociar('v', { proveedorId: 'p', precioCostoProveedor: 1, tiempoEntregaDias: 2 })).rejects.toThrow(ConflictException);
    expect(mp.save).not.toHaveBeenCalled();
  });

  it('asociar crea cuando no existe', async () => {
    va.findOne.mockResolvedValue({ id: 'v' });
    pr.findOne.mockResolvedValue({ id: 'p' });
    mp.findOne.mockResolvedValue(null);
    await service.asociar('v', { proveedorId: 'p', precioCostoProveedor: 1, tiempoEntregaDias: 2 });
    expect(mp.save).toHaveBeenCalled();
  });

  it('listarPorProveedor trae variante y material', async () => {
    mp.find.mockResolvedValue([]);
    await service.listarPorProveedor('p');
    expect(mp.find).toHaveBeenCalledWith(expect.objectContaining({ relations: ['variante', 'variante.material'] }));
  });

  it('actualizar cambia solo lo enviado y 404 si no existe', async () => {
    mp.findOne.mockResolvedValueOnce({ id: 'a', precioCostoProveedor: 5, tiempoEntregaDias: 3 });
    const r = await service.actualizar('a', { precioCostoProveedor: 9 });
    expect(r).toMatchObject({ precioCostoProveedor: 9, tiempoEntregaDias: 3 });
    mp.findOne.mockResolvedValueOnce(null);
    await expect(service.actualizar('x', {})).rejects.toThrow(NotFoundException);
  });

  it('eliminar da 404 si no afectó filas', async () => {
    mp.delete.mockResolvedValueOnce({ affected: 0 });
    await expect(service.eliminar('x')).rejects.toThrow(NotFoundException);
    mp.delete.mockResolvedValueOnce({ affected: 1 });
    await expect(service.eliminar('a')).resolves.toBeUndefined();
  });
});
