import { IsNumber, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

// El stock no se edita acá: solo cambia con movimientos de inventario.
export class UpdateVarianteDto {
  @IsString()
  @IsOptional()
  @MaxLength(60)
  skuVariante?: string;

  @IsObject()
  @IsOptional()
  atributos?: Record<string, string>;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  precioVenta?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  precioCosto?: number;
}
