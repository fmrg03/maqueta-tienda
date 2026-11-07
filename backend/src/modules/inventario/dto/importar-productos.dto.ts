import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested } from 'class-validator';

export class FilaImportacionDto {
  @IsString()
  @MaxLength(50)
  sku: string;

  @IsString()
  @MaxLength(200)
  nombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  categoria?: string;

  // SKU de la presentación; si no viene se usa el SKU del producto.
  @IsString()
  @IsOptional()
  @MaxLength(50)
  skuVariante?: string;

  // Texto libre de la presentación (ej. "Saco 25 kg"); queda como atributo.
  @IsString()
  @IsOptional()
  @MaxLength(100)
  presentacion?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioVenta: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioCosto: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  precioDivisas?: number | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  tiempoEntregaDias?: number;
}

export class ImportarProductosDto {
  // Proveedor al que se asocian todos los productos cargados.
  @IsUUID()
  @IsOptional()
  proveedorId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => FilaImportacionDto)
  filas: FilaImportacionDto[];
}
