import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateVarianteDto {
  @IsString()
  @MaxLength(60)
  skuVariante: string;

  @IsObject()
  @IsOptional()
  atributos?: Record<string, string>;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stock?: number;

  // Requerido: cada presentación (25kg, 50kg, etc.) tiene su propio
  // precio, no hereda uno del material padre.
  @IsNumber()
  @Min(0)
  precioVenta: number;

  @IsNumber()
  @Min(0)
  precioCosto: number;
}
