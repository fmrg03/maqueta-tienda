import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombre: string;

  @IsEmail()
  @MaxLength(150)
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72) // límite real de bcrypt
  password: string;

  @IsString()
  @MaxLength(40)
  @IsOptional()
  rol?: string;

  @IsPhoneNumber('VE', { message: 'El teléfono no es válido (ejemplo: 0414 1234567)' })
  @IsOptional()
  telefono?: string;
}
