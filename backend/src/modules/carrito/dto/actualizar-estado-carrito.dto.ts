import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoSolicitudCarrito } from '../entities/solicitud-carrito.entity';
import { SanitizedText } from '../../../common/sanitize/sanitized-text.decorator';

export class ActualizarEstadoCarritoDto {
  @IsEnum(EstadoSolicitudCarrito)
  estado: EstadoSolicitudCarrito;

  @IsString()
  @IsOptional()
  @SanitizedText()
  notas?: string;
}
