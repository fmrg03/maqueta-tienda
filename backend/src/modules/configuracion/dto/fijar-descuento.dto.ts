import { ArrayUnique, IsArray, IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { MetodoPago } from '../../carrito/entities/solicitud-carrito.entity';

export class FijarDescuentoDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  porcentaje: number;

  // Métodos de pago a los que aplica el descuento. Si no viene no se cambia.
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(MetodoPago, { each: true })
  metodos?: MetodoPago[];
}
