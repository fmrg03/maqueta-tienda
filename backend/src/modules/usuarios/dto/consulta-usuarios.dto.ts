import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { RolUsuario } from '../entities/usuario.entity';

export class ConsultaUsuariosDto {
  @IsOptional()
  @IsEnum(RolUsuario)
  rol?: RolUsuario;

  @IsOptional()
  @IsIn(['activos', 'inactivos', 'todos'])
  estado?: 'activos' | 'inactivos' | 'todos';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  buscar?: string;
}
