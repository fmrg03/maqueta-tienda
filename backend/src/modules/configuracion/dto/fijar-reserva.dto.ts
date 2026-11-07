import { IsInt, Max, Min } from 'class-validator';

export class FijarReservaDto {
  @IsInt()
  @Min(1)
  @Max(365)
  dias: number;
}
