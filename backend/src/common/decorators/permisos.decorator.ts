import { SetMetadata } from '@nestjs/common';

export const PERMISOS_KEY = 'permisos';
/** El usuario necesita AL MENOS UNO de los permisos listados (admin siempre pasa). */
export const Permisos = (...permisos: string[]) => SetMetadata(PERMISOS_KEY, permisos);
