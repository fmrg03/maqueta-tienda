import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateUsuarioDto } from './create-usuario.dto';

// La contraseña no se actualiza por esta vía (tiene su propio endpoint:
// restablecer-password) — se omite explícitamente.
export class UpdateUsuarioDto extends PartialType(
  OmitType(CreateUsuarioDto, ['password'] as const),
) {
  // Activar / desactivar la cuenta (la cuenta protegida nunca se desactiva).
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
