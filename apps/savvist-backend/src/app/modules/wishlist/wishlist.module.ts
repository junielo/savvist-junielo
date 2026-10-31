import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CurrentUserGuard } from '../../common/current-user/current-user.guard';
import { UsersModule } from '../users/users.module';
import { RecordLogsModule } from '../record-logs/record-logs.module';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { WishlistItem, WishlistSchema } from './schemas/wishlist.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WishlistItem.name, schema: WishlistSchema }]),
    UsersModule,
    RecordLogsModule,
  ],
  controllers: [WishlistController],
  providers: [WishlistService, CurrentUserGuard],
  exports: [WishlistService, MongooseModule],
})
export class WishlistModule {}
