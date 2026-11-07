import {
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  IsUUID,
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

  // Precio si paga en divisas (uso interno). Vacío = igual al precio de venta.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  precioDivisas?: number | null;

  // Proveedor que suministra esta presentación (opcional). Su costo es el
  // `precioCosto` indicado arriba.
  @IsUUID()
  @IsOptional()
  proveedorId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  tiempoEntregaDias?: number;
}
