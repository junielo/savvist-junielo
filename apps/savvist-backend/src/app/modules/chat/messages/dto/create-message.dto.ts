import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(8000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  content!: string;

  @IsEnum(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsOptional()
  @IsEnum(['complete', 'streaming', 'error'])
  status?: 'complete' | 'streaming' | 'error';
}
