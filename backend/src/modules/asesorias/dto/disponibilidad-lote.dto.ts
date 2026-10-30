import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString } from 'class-validator';

export class DisponibilidadLoteDto {
  // Instantes ISO (el panel convierte de hora de Caracas a UTC). Máx. 300 por llamada.
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(300)
  @IsDateString({}, { each: true })
  fechasHora: string[];
}
