import { IsInt, IsNumber, IsUUID, Min } from 'class-validator';

export class AsociarProveedorDto {
  @IsUUID()
  proveedorId: string;

  @IsNumber()
  @Min(0)
  precioCostoProveedor: number;

  @IsInt()
  @Min(0)
  tiempoEntregaDias: number;
}
