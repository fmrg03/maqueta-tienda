import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUsuarioDto } from './create-usuario.dto';

// La contraseña no se actualiza por esta vía (requeriría flujo aparte
// con verificación de contraseña actual) — se omite explícitamente.
export class UpdateUsuarioDto extends PartialType(
  OmitType(CreateUsuarioDto, ['password'] as const),
) {}
