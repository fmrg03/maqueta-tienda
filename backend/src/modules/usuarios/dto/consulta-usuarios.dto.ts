import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ConsultaUsuariosDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  rol?: string;

  @IsOptional()
  @IsIn(['activos', 'inactivos', 'todos'])
  estado?: 'activos' | 'inactivos' | 'todos';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  buscar?: string;
}
