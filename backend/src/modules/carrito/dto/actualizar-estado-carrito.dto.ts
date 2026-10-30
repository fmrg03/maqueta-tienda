import { IsIn, IsOptional, IsString } from 'class-validator';
import { EstadoSolicitudCarrito } from '../entities/solicitud-carrito.entity';
import { SanitizedText } from '../../../common/sanitize/sanitized-text.decorator';

// Por este endpoint solo se mueve el seguimiento comercial. Cerrar y cancelar
// tienen endpoints propios porque tocan inventario y dinero.
export const ESTADOS_MANUALES = [
  EstadoSolicitudCarrito.NUEVA,
  EstadoSolicitudCarrito.CONTACTADO,
  EstadoSolicitudCarrito.PAGO_EN_VERIFICACION,
] as const;

export class ActualizarEstadoCarritoDto {
  @IsIn(ESTADOS_MANUALES)
  estado: EstadoSolicitudCarrito;

  @IsString()
  @IsOptional()
  @SanitizedText()
  notas?: string;
}
