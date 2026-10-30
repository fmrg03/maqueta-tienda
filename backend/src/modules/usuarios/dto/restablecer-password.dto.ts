import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RestablecerPasswordDto {
  // Si no se envía, el sistema genera una contraseña temporal.
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72)
  password?: string;
}
