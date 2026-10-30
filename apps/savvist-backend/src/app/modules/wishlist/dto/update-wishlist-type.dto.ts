import { IsOptional, IsString } from 'class-validator';

export class UpdateWishlistTypeDto {
  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  type?: string;

  getPriority(): string {
    return this.priority ?? this.type ?? '';
  }
}
