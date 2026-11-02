import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { SanitizedText } from '../../../common/sanitize/sanitized-text.decorator';

export class CreateServicioDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @SanitizedText()
  nombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  @SanitizedText()
  descripcion?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  @SanitizedText()
  unidad: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100_000_000)
  precioBase: number;
}

export class UpdateServicioDto extends PartialType(CreateServicioDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
