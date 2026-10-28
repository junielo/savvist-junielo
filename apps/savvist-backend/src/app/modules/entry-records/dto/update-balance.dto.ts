import { IsDateString, IsMongoId, IsNumber, IsOptional, Matches, Min } from 'class-validator';

export class UpdateBalanceDto {
  @IsMongoId({ message: 'accountEntryId must be a valid ObjectId' })
  accountEntryId!: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'day must be in YYYY-MM-DD format' })
  day?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date?: string;

  @IsNumber({}, { message: 'balance must be a number' })
  @Min(0, { message: 'balance must be greater than or equal to 0' })
  balance!: number;

  @IsOptional()
  @IsDateString({}, { message: 'recordedDate must be a valid ISO date string' })
  recordedDate?: string;
}

