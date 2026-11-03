import { IsNotEmpty, IsString } from 'class-validator';

export class ComputeDailyMetricDto {
  @IsString()
  @IsNotEmpty()
  day!: string;
}
