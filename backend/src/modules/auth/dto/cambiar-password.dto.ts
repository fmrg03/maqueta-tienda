import { IsString, MaxLength, MinLength } from 'class-validator';

export class CambiarPasswordDto {
  @IsString()
  @MaxLength(72)
  actual: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña nueva debe tener al menos 8 caracteres' })
  @MaxLength(72)
  nueva: string;
}
