import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateWishlistDto } from './create-wishlist.dto';

export class UpdateWishlistDto extends PartialType(CreateWishlistDto) {
  @IsOptional()
  @IsEnum(['pending', 'purchased'])
  status?: string;
}
