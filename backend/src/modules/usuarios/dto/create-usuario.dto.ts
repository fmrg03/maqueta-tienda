import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RolUsuario } from '../entities/usuario.entity';

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

  @IsEnum(RolUsuario)
  @IsOptional()
  rol?: RolUsuario;

  @IsPhoneNumber('VE', { message: 'El teléfono no es válido (ejemplo: 0414 1234567)' })
  @IsOptional()
  telefono?: string;
}
