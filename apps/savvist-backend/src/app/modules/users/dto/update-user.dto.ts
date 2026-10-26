import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(60)
  displayName?: string;

  @IsOptional() @IsInt() @Min(0)
  baseSalary?: number;

  @IsOptional() @IsInt() @Min(1) @Max(31)
  salaryDay1?: number;

  @IsOptional() @IsInt() @Min(1) @Max(31)
  salaryDay2?: number;

  @IsOptional() @IsBoolean()
  isUnemployed?: boolean;
}