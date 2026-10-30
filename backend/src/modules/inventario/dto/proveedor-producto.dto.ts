import { IsInt, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

/** Alta desde la ficha del proveedor (la presentación va en el cuerpo). */
export class AsociarProductoDto {
  @IsUUID()
  varianteId: string;

  @IsNumber()
  @Min(0)
  precioCostoProveedor: number;

  @IsInt()
  @Min(0)
  tiempoEntregaDias: number;
}

export class ActualizarAsociacionDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioCostoProveedor?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  tiempoEntregaDias?: number;
}
