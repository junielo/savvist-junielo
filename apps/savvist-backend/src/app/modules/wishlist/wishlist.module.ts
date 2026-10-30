import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CurrentUserGuard } from '../../common/current-user/current-user.guard';
import { UsersModule } from '../users/users.module';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { WishlistItem, WishlistSchema } from './schemas/wishlist.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WishlistItem.name, schema: WishlistSchema }]),
    UsersModule,
  ],
  controllers: [WishlistController],
  providers: [WishlistService, CurrentUserGuard],
  exports: [WishlistService, MongooseModule],
})
export class WishlistModule {}
