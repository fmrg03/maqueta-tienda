import { IsOptional, IsString } from 'class-validator';
import { SanitizedText } from '../../../common/sanitize/sanitized-text.decorator';

export class RegistrarLlamadaDto {
  @IsString()
  @IsOptional()
  @SanitizedText()
  notasLlamada?: string;
}
