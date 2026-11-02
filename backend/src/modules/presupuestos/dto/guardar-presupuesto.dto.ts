import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SanitizedText } from '../../../common/sanitize/sanitized-text.decorator';

export class ItemPresupuestoDto {
  @IsIn(['producto', 'combo', 'servicio'])
  tipo: 'producto' | 'combo' | 'servicio';

  @IsUUID()
  @IsOptional()
  varianteId?: string;

  @IsUUID()
  @IsOptional()
  comboId?: string;

  @IsUUID()
  @IsOptional()
  servicioId?: string;

  // Si no viene, se toma del catálogo (producto, combo o servicio guardado).
  @IsString()
  @IsOptional()
  @MaxLength(300)
  @SanitizedText()
  descripcion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  @SanitizedText()
  unidad?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000)
  cantidad: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100_000_000)
  @IsOptional()
  precioUnitario?: number;
}

export class GuardarPresupuestoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @SanitizedText()
  clienteNombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  @SanitizedText()
  clienteTelefono?: string;

  @IsEmail()
  @IsOptional()
  clienteEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  @SanitizedText()
  obra?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  @SanitizedText()
  notas?: string;

  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  validezDias?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  descuentoPct?: number;

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ItemPresupuestoDto)
  items: ItemPresupuestoDto[];
}

export class EstadoPresupuestoDto {
  @IsIn(['borrador', 'enviado', 'aprobado', 'rechazado'])
  estado: 'borrador' | 'enviado' | 'aprobado' | 'rechazado';
}
