import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { TipoMovimiento } from '../entities/movimiento-inventario.entity';

export class RegistrarMovimientoDto {
  @IsUUID()
  varianteId: string;

  @IsEnum(TipoMovimiento)
  tipo: TipoMovimiento;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsString()
  @IsOptional()
  motivo?: string;

  // Solo para entradas: a quién se le compró y cuánto se pagó por unidad (USD).
  @IsOptional()
  @IsUUID()
  proveedorId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  costoUnitario?: number;
}
