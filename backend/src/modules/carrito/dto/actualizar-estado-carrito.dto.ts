import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoSolicitudCarrito } from '../entities/solicitud-carrito.entity';

export class ActualizarEstadoCarritoDto {
  @IsEnum(EstadoSolicitudCarrito)
  estado: EstadoSolicitudCarrito;

  @IsString()
  @IsOptional()
  notas?: string;
}
