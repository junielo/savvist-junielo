import { IsMongoId, IsOptional, Matches } from 'class-validator';

export class DeleteBalanceDto {
  @IsOptional()
  @IsMongoId({ message: 'accountEntryId must be a valid ObjectId' })
  accountEntryId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'day must be in YYYY-MM-DD format' })
  day?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date?: string;
}

