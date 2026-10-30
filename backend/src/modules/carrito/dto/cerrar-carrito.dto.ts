import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
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

  // Lo realmente cobrado; si no viene vale el total final / suma de ítems.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  montoCobrado?: number;
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
