import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { PERMISOS_KEY } from '../../../common/decorators/permisos.decorator';
import { RolesService } from '../../roles/roles.service';

/**
 * - `@Permisos(...)`: pasa si el rol del usuario tiene alguno (admin siempre).
 * - `@Roles(...)`: pasa si el rol del usuario es uno de los nombrados
 *   (se usa para lo exclusivo del admin: usuarios, roles, anulaciones).
 * - Sin ninguno => cualquier usuario autenticado.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly roles: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const destinos = [context.getHandler(), context.getClass()];
    const permisosRequeridos = this.reflector.getAllAndOverride<string[]>(PERMISOS_KEY, destinos);
    const rolesRequeridos = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, destinos);
    const { user } = context.switchToHttp().getRequest();

    if (permisosRequeridos?.length) {
      if (user?.rol === 'admin') return true;
      const propios = await this.roles.permisosDeRol(user?.rol);
      return permisosRequeridos.some((p) => propios.includes(p));
    }
    if (rolesRequeridos?.length) return rolesRequeridos.includes(user?.rol);
    return true;
  }
}
