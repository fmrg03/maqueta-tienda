import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  @MaxLength(50)
  sku: string;

  @IsString()
  @MaxLength(200)
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsUUID()
  @IsOptional()
  categoriaId?: string;

  @IsNumber()
  @Min(0)
  precioCosto: number;

  @IsNumber()
  @Min(0)
  precioVenta: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  imagenUrl?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
