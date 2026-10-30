import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SanitizedText } from '../../../common/sanitize/sanitized-text.decorator';
import { ComboItemInputDto } from './create-combo.dto';

export class UpdateComboDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre?: string;

  @IsOptional()
  @IsString()
  @SanitizedText()
  descripcion?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioCombo?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  // Si viene, REEMPLAZA todos los ítems del combo.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ComboItemInputDto)
  items?: ComboItemInputDto[];
}
