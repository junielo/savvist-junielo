import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateWishlistDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(80)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name!: string;

  @IsNumber()
  @IsPositive()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
