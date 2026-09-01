import { IsDateString } from 'class-validator';

export class CrearDisponibilidadDto {
  @IsDateString()
  fechaHora: string;
}
