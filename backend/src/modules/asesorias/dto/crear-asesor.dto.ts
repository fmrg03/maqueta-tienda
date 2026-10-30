import { IsEmail, IsOptional, IsPhoneNumber, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { SanitizedText } from '../../../common/sanitize/sanitized-text.decorator';

/**
 * Dos formas de crear un asesor:
 *  - con una cuenta existente: `usuarioId`
 *  - cuenta nueva (lo normal desde el panel): `nombre` + `email` + `password`
 */
export class CrearAsesorDto {
  @ValidateIf((o: CrearAsesorDto) => !o.email)
  @IsUUID()
  usuarioId?: string;

  @ValidateIf((o: CrearAsesorDto) => !o.usuarioId)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombre?: string;

  @ValidateIf((o: CrearAsesorDto) => !o.usuarioId)
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @ValidateIf((o: CrearAsesorDto) => !o.usuarioId)
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @IsPhoneNumber('VE')
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  @SanitizedText()
  especialidad?: string;
}
