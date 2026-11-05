import { Type } from 'class-transformer';
import { SanitizedText } from '../../../common/sanitize/sanitized-text.decorator';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ItemEditadoDto {
  @IsUUID()
  @IsOptional()
  materialId?: string;

  @IsUUID()
  @IsOptional()
  varianteId?: string;

  @IsUUID()
  @IsOptional()
  comboId?: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  cantidad: number;

  // Si no viene: se conserva el precio pactado del mismo ítem o el de lista.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  precioUnitario?: number;
}

export class ServicioEditadoDto {
  @IsUUID()
  @IsOptional()
  servicioId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(300)
  @SanitizedText()
  descripcion: string;

  @IsString()
  @MaxLength(30)
  @IsOptional()
  @SanitizedText()
  unidad?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000)
  cantidad: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000000)
  precioUnitario: number;
}

export class EditarItemsCarritoDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemEditadoDto)
  items: ItemEditadoDto[];

  // undefined = conservar los servicios que ya tiene el pedido; [] = quitarlos todos.
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ServicioEditadoDto)
  servicios?: ServicioEditadoDto[];

  // undefined = no tocar; null = quitar el total fijo y usar la suma de ítems.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  totalFinal?: number | null;
}
