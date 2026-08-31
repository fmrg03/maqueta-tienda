import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
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
}
