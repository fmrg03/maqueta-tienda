import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { SanitizedText } from '../../../common/sanitize/sanitized-text.decorator';

export class ActualizarAsesorDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @SanitizedText()
  especialidad?: string;

  // false = deja de aparecer para los clientes (sus asesorías existentes se conservan).
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
