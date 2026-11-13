import { IsArray, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CrearRolDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9_]{1,39}$/, { message: 'La clave usa minúsculas, números y guion bajo (2-40)' })
  clave: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;

  @IsArray()
  @IsString({ each: true })
  permisos: string[];
}

export class ActualizarRolDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permisos?: string[];
}
