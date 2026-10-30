import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateWishlistTypeDto {
  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsNotEmpty()
  @IsString()
  getPriority(): string {
    return this.priority ?? this.type ?? '';
  }
}
