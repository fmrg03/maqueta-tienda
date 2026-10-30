import { IsString, MaxLength, MinLength } from 'class-validator';
import { SanitizedText } from '../../../common/sanitize/sanitized-text.decorator';

export class CategoriaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @SanitizedText()
  nombre: string;
}
