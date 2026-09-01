import { IsOptional, IsString } from 'class-validator';

export class RegistrarLlamadaDto {
  @IsString()
  @IsOptional()
  notasLlamada?: string;
}
