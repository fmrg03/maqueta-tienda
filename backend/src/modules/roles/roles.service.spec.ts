import { BadRequestException, ConflictException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { expandirPermisos, todosLosPermisos } from './permisos';

function crear(rolBd?: { clave: string; permisos: string[]; sistema?: boolean; id?: string }) {
  const repo: any = {
    findOne: jest.fn(async () => rolBd ?? null),
    find: jest.fn(async () => []),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => x),
    remove: jest.fn(),
  };
  const dataSource: any = { manager: { query: jest.fn(async () => [{ n: 0 }]) } };
  return { servicio: new RolesService(repo, dataSource), repo, dataSource };
}

describe('RolesService', () => {
  it('admin tiene todos los permisos sin consultar la BD', async () => {
    const { servicio, repo } = crear();
    expect(await servicio.permisosDeRol('admin')).toEqual(todosLosPermisos());
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('gestionar implica ver', async () => {
    const { servicio } = crear({ clave: 'x', permisos: ['proveedores.gestionar'] });
    expect(await servicio.permisosDeRol('x')).toEqual(['proveedores.gestionar', 'proveedores.ver']);
    expect(expandirPermisos(['reportes.ver'])).toEqual(['reportes.ver']);
  });

  it('rol desconocido o vacío no tiene permisos', async () => {
    const { servicio } = crear();
    expect(await servicio.permisosDeRol('fantasma')).toEqual([]);
    expect(await servicio.permisosDeRol(undefined)).toEqual([]);
  });

  it('rechaza permisos inventados y claves reservadas', async () => {
    const { servicio } = crear();
    await expect(servicio.crear({ clave: 'admin', nombre: 'Otro', permisos: [] })).rejects.toBeInstanceOf(ConflictException);
    await expect(servicio.crear({ clave: 'caja', nombre: 'Caja', permisos: ['nada.inventado'] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('no modifica ni elimina el rol admin; no elimina roles de sistema', async () => {
    const admin = crear({ clave: 'admin', permisos: [], sistema: true, id: '1' });
    await expect(admin.servicio.actualizar('1', { permisos: [] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(admin.servicio.eliminar('1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('no elimina un rol con usuarios', async () => {
    const { servicio, dataSource } = crear({ clave: 'caja', permisos: [], sistema: false, id: '2' });
    dataSource.manager.query.mockResolvedValue([{ n: 3 }]);
    await expect(servicio.eliminar('2')).rejects.toBeInstanceOf(ConflictException);
  });

  it('editar permisos invalida la caché', async () => {
    const { servicio, repo } = crear({ clave: 'caja', permisos: ['reportes.ver'], sistema: false, id: '2' });
    await servicio.permisosDeRol('caja');
    repo.findOne.mockResolvedValue({ clave: 'caja', permisos: ['reportes.ver'], sistema: false, id: '2' });
    await servicio.actualizar('2', { permisos: ['solicitudes.ver'] });
    repo.findOne.mockResolvedValue({ clave: 'caja', permisos: ['solicitudes.ver'] });
    expect(await servicio.permisosDeRol('caja')).toEqual(['solicitudes.ver']);
  });
});
