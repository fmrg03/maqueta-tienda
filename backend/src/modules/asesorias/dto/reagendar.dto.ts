import { IsDateString } from 'class-validator';

export class ReagendarDto {
  // Debe ser una franja libre del mismo asesor (validado en el servicio).
  @IsDateString()
  fechaHoraLlamada: string;
}
