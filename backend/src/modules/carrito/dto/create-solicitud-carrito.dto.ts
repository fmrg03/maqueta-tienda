import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CanalEnvio } from '../entities/solicitud-carrito.entity';

class ItemCarritoInputDto {
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
  cantidad: number;
}

export class CreateSolicitudCarritoDto {
  @IsString()
  @MaxLength(150)
  clienteNombre: string;

  @IsPhoneNumber('VE')
  clienteTelefono: string;

  @IsEmail()
  @IsOptional()
  clienteEmail?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemCarritoInputDto)
  items: ItemCarritoInputDto[];

  @IsEnum(CanalEnvio)
  @IsOptional()
  canalEnvio?: CanalEnvio;
}
