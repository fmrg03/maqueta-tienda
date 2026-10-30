import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriasService } from './categorias.service';

function crear(existente: any, porId: any = null) {
  const qb = { where: jest.fn().mockReturnThis(), getOne: jest.fn(async () => existente) };
  const repo: any = {
    createQueryBuilder: jest.fn(() => qb),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 'c1', ...x })),
    findOne: jest.fn(async () => porId),
  };
  return { service: new CategoriasService(repo), repo };
}

describe('CategoriasService', () => {
  it('crea una categoría nueva recortando espacios', async () => {
    const { service, repo } = crear(null);
    const c = await service.crear({ nombre: '  Pinturas  ' });
    expect(c.nombre).toBe('Pinturas');
    expect(repo.save).toHaveBeenCalled();
  });

  it('rechaza duplicados sin distinguir mayúsculas', async () => {
    const { service } = crear({ id: 'x', nombre: 'Pinturas' });
    await expect(service.crear({ nombre: 'pinturas' })).rejects.toThrow(ConflictException);
  });

  it('renombrar: 404 si no existe, y permite cambiar solo mayúsculas', async () => {
    await expect(crear(null, null).service.renombrar('x', { nombre: 'A' })).rejects.toThrow(NotFoundException);
    const { service } = crear({ id: 'c1', nombre: 'pinturas' }, { id: 'c1', nombre: 'pinturas' });
    const r = await service.renombrar('c1', { nombre: 'Pinturas' });
    expect(r.nombre).toBe('Pinturas');
  });
});
