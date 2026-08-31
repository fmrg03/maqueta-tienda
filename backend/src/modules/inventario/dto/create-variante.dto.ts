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

  @IsNumber()
  @Min(0)
  @IsOptional()
  precioVentaOverride?: number;
}
