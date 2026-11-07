import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MetodoPago } from '../entities/solicitud-carrito.entity';
import { SanitizedText } from '../../../common/sanitize/sanitized-text.decorator';

export class PagoDto {
  @IsEnum(MetodoPago)
  metodo: MetodoPago;

  // Dinero recibido, en USD.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monto: number;

  // Deuda (USD BCV) que cubre este pago. Si no viene: en divisas se calcula con el
  // precio de divisas del pedido; en los demás métodos es igual al monto.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsOptional()
  abona?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @SanitizedText()
  referencia?: string;

  // Tasa BCV (Bs/USD) para métodos en bolívares; si no viene se usa la vigente.
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @IsOptional()
  tasaBcv?: number;
}

export class CerrarCarritoDto {
  // Pagos a registrar justo antes de cerrar (cierre en un solo paso). Sin pagos
  // cierra con lo ya abonado, siempre que esté todo cobrado.
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PagoDto)
  @IsOptional()
  pagos?: PagoDto[];
}

export class ReservaDto {
  // Días de reserva a partir de hoy.
  @IsInt()
  @Min(1)
  @Max(365)
  dias: number;
}

export class CostoServiciosDto {
  // null quita el costo registrado.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  costo: number | null;
}

export class CancelarCarritoDto {
  @IsString()
  @MaxLength(300)
  @SanitizedText()
  motivo: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  montoReembolsado?: number;
}
