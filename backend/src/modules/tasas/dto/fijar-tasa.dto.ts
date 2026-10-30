import { IsNumber, Max, Min } from 'class-validator';

export class FijarTasaDto {
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Max(1_000_000)
  valor: number;
}
