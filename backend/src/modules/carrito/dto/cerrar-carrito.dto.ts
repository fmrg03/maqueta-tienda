import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { MetodoPago } from '../entities/solicitud-carrito.entity';
import { SanitizedText } from '../../../common/sanitize/sanitized-text.decorator';

export class CerrarCarritoDto {
  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @SanitizedText()
  referenciaPago?: string;

  // Solo para forzar un monto distinto al calculado (descuento manual, ajuste).
  // Si no viene, vale el total del pedido menos el descuento por divisas.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  montoCobrado?: number;

  // Aplica el descuento por divisas si el método lo permite (por defecto sí).
  @IsBoolean()
  @IsOptional()
  aplicarDescuento?: boolean;

  // Tasa BCV a registrar; si no viene se usa la vigente.
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @IsOptional()
  tasaBcv?: number;
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
