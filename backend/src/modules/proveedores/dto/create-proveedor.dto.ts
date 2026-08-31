import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProveedorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  contacto?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  condicionesPago?: string;
}
