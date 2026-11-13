import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { PERMISOS_KEY } from '../../../common/decorators/permisos.decorator';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';

const ctx = (rol: string | undefined) =>
  ({ getHandler: () => 'h', getClass: () => 'c', switchToHttp: () => ({ getRequest: () => ({ user: rol ? { rol } : undefined }) }) }) as any;

function guard(meta: Record<string, string[] | undefined>, permisosDelRol: string[] = []) {
  const reflector = { getAllAndOverride: (k: string) => meta[k] } as unknown as Reflector;
  return new RolesGuard(reflector, { permisosDeRol: async () => permisosDelRol } as any);
}

describe('RolesGuard', () => {
  it('sin metadata deja pasar a cualquier autenticado', async () => {
    expect(await guard({}).canActivate(ctx('cliente'))).toBe(true);
  });
  it('@Permisos: admin siempre pasa; otros solo con alguno de los permisos', async () => {
    const meta = { [PERMISOS_KEY]: ['reportes.ver', 'tasas.gestionar'] };
    expect(await guard(meta).canActivate(ctx('admin'))).toBe(true);
    expect(await guard(meta, ['reportes.ver']).canActivate(ctx('contabilidad'))).toBe(true);
    expect(await guard(meta, ['inventario.ver']).canActivate(ctx('almacen'))).toBe(false);
    expect(await guard(meta, []).canActivate(ctx(undefined))).toBe(false);
  });
  it('@Roles("admin"): solo el admin, aunque otro rol tenga permisos', async () => {
    const meta = { [ROLES_KEY]: ['admin'] };
    expect(await guard(meta).canActivate(ctx('admin'))).toBe(true);
    expect(await guard(meta, ['reportes.ver']).canActivate(ctx('ventas'))).toBe(false);
  });
});
