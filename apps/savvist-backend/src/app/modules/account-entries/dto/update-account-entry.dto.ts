import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AccountType } from '../../../../../../../libs/models/account-type';

export class UpdateAccountEntryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(60)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @IsOptional()
  @IsEnum(AccountType, {
    message: 'type must be one of: cash, credit, savings',
  })
  type?: AccountType;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
