import { IsDateString, IsEmail, IsOptional, IsPhoneNumber, IsString, IsUUID, MaxLength } from 'class-validator';

export class CrearSolicitudAsesoriaDto {
  @IsString()
  @MaxLength(150)
  clienteNombre: string;

  @IsPhoneNumber('VE')
  clienteTelefono: string;

  @IsEmail()
  @IsOptional()
  clienteEmail?: string;

  @IsUUID()
  asesorId: string;

  // Debe corresponder a una franja existente y disponible en
  // DisponibilidadAsesor (validado en el servicio).
  @IsDateString()
  fechaHoraLlamada: string;
}
