import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CurrentUser } from '../../common/current-user/current-user.decorator';
import { CurrentUserGuard } from '../../common/current-user/current-user.guard';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { UserDocument } from '../users/schemas/user.schema';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { UpdateWishlistTypeDto } from './dto/update-wishlist-type.dto';
import { WishlistService } from './wishlist.service';

@UseGuards(CurrentUserGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(
    @Inject(WishlistService)
    private readonly wishlistService: WishlistService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: UserDocument,
    @Body() createWishlistDto: CreateWishlistDto,
  ) {
    return this.wishlistService.create(user._id, createWishlistDto);
  }

  @Get()
  findAll(@CurrentUser() user: UserDocument) {
    return this.wishlistService.findAll(user._id);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.wishlistService.findOne(user._id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateWishlistDto: UpdateWishlistDto,
  ) {
    return this.wishlistService.update(user._id, id, updateWishlistDto);
  }

  @Patch(':id/type')
  updateType(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateWishlistTypeDto: UpdateWishlistTypeDto,
  ) {
    return this.wishlistService.updateType(user._id, id, updateWishlistTypeDto.getPriority());
  }

  @Post(':id/purchase')
  purchase(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.wishlistService.purchase(user._id, id);
  }

  @Post(':id/undo-purchase')
  undoPurchase(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.wishlistService.undoPurchase(user._id, id);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.wishlistService.remove(user._id, id);
  }
}
