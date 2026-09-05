import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SanitizedText } from '../../../common/sanitize/sanitized-text.decorator';

class ComboItemInputDto {
  // Siempre una variante específica — ver el comentario en la entidad
  // ComboItem sobre por qué ya no se acepta un materialId genérico.
  @IsUUID()
  varianteId: string;

  @IsNumber()
  @Min(1)
  cantidad: number;
}

export class CreateComboDto {
  @IsString()
  @MaxLength(200)
  nombre: string;

  @IsString()
  @IsOptional()
  @SanitizedText()
  descripcion?: string;

  @IsNumber()
  @Min(0)
  precioCombo: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ComboItemInputDto)
  items: ComboItemInputDto[];
}
