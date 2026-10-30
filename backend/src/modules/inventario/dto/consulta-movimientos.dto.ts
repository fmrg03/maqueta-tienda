import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { TipoMovimiento } from '../entities/movimiento-inventario.entity';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class ConsultaMovimientosDto {
  @IsOptional()
  @IsUUID()
  variante?: string;

  @IsOptional()
  @IsUUID()
  material?: string;

  @IsOptional()
  @IsEnum(TipoMovimiento)
  tipo?: TipoMovimiento;

  // venta = generado al cerrar/anular un carrito; manual = cargado desde el panel.
  @IsOptional()
  @IsIn(['venta', 'manual'])
  origen?: 'venta' | 'manual';

  // Fechas de calendario (YYYY-MM-DD) en hora de Caracas, ambas inclusive.
  @IsOptional()
  @Matches(FECHA, { message: 'desde debe tener formato AAAA-MM-DD' })
  desde?: string;

  @IsOptional()
  @Matches(FECHA, { message: 'hasta debe tener formato AAAA-MM-DD' })
  hasta?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  buscar?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limite?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  desplazamiento?: number;
}
