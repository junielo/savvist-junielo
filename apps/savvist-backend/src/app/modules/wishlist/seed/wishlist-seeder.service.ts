import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TransactionService } from '../../../database/transaction.service';
import { RecordLogsService } from '../../record-logs/record-logs.service';
import { UsersService } from '../../users/users.service';
import { WishlistItem, WishlistDocument } from '../schemas/wishlist.schema';

interface SeedWishlistItem {
  name: string;
  amount: number;
  dateString: string;
}

const SEED_ITEMS: SeedWishlistItem[] = [
  { name: 'Powerbank', amount: 2500, dateString: '2026-10-05' },
  { name: 'Orashare Fan', amount: 3500, dateString: '2026-10-07' },
  { name: 'Shelf Rack', amount: 1700, dateString: '2026-10-12' },
  { name: 'Extension Cord', amount: 800, dateString: '2026-10-18' },
  { name: 'Intercom', amount: 3800, dateString: '2026-10-21' },
  { name: 'Monitor Bracket', amount: 750, dateString: '2026-10-28' },
  { name: 'Electric Treadmill', amount: 5800, dateString: '2026-11-01' },
  { name: 'Saddle Bag', amount: 4700, dateString: '2026-11-03' },
  { name: 'Video Extender', amount: 4700, dateString: '2026-11-03' },
  { name: 'Wifi Router', amount: 6000, dateString: '2026-11-05' },
  { name: 'Keyboard', amount: 4200, dateString: '2026-11-08' },
];

@Injectable()
export class WishlistSeederService implements OnModuleInit {
  private readonly logger = new Logger(WishlistSeederService.name);

  constructor(
    @InjectModel(WishlistItem.name)
    private readonly wishlistModel: Model<WishlistDocument>,
    private readonly usersService: UsersService,
    private readonly transactionService: TransactionService,
    private readonly recordLogsService: RecordLogsService,
  ) {}

  async onModuleInit() {
    try {
      const user = await this.usersService.findCurrent();
      if (!user) return;

      const count = await this.wishlistModel.countDocuments({ userId: user._id, status: 'purchased' });
      if (count > 0) return;

      await this.transactionService.run(async (session) => {
        for (const data of SEED_ITEMS) {
          const purchaseDate = new Date(`${data.dateString}T00:00:00.000Z`);
          const createdItem = await this.wishlistModel.create(
            [
              {
                userId: user._id,
                name: data.name,
                amount: data.amount,
                priority: 'normal',
                status: 'purchased',
                purchasedAt: purchaseDate,
                createdAt: purchaseDate,
                updatedAt: purchaseDate,
              },
            ],
            { session },
          );

          const item = createdItem[0];

          await this.recordLogsService.create(
            {
              userId: user._id,
              name: item.name,
              amount: item.amount,
              recordType: 'wishlist',
              action: 'purchased',
              date: purchaseDate,
              sourceCollection: 'wishlistItems',
              sourceId: item._id,
            },
            session,
          );
        }
      });

      this.logger.log(`Seeded ${SEED_ITEMS.length} purchased wishlist items`);
    } catch (error) {
      this.logger.error('Failed to seed wishlist items', error);
    }
  }
}
