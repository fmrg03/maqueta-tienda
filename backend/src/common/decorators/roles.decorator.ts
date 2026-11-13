import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
/** Restringe por nombre de rol. Úsalo solo para lo exclusivo del admin. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
