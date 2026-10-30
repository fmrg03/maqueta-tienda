import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
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

export class EditarItemsCarritoDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemEditadoDto)
  items: ItemEditadoDto[];

  // undefined = no tocar; null = quitar el total fijo y usar la suma de ítems.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  totalFinal?: number | null;
}
