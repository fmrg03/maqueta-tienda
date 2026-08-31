import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class ReporteQueryDto {
  @IsDateString()
  desde: string;

  @IsDateString()
  hasta: string;

  @IsIn(['semana', 'mes', 'anio'])
  @IsOptional()
  agrupacion?: 'semana' | 'mes' | 'anio';
}
