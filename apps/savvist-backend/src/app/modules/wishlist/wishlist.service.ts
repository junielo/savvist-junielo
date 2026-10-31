import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TransactionService } from '../../database/transaction.service';
import { RecordLogsService } from '../record-logs/record-logs.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { WishlistItem, WishlistDocument } from './schemas/wishlist.schema';

const PRIORITY_WEIGHTS: Record<string, number> = {
  asap: 1,
  priority: 2,
  important: 3,
  normal: 4,
  peripheral: 5,
};

function normalizePriority(val?: string): string | undefined {
  if (!val) return undefined;
  const lower = val.toLowerCase();
  const valid = ['asap', 'priority', 'important', 'normal', 'peripheral'];
  if (valid.includes(lower)) {
    return lower;
  }
  return undefined;
}

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(
    @InjectModel(WishlistItem.name)
    private readonly wishlistModel: Model<WishlistDocument>,
    private readonly transactionService: TransactionService,
    private readonly recordLogsService: RecordLogsService,
  ) {}

  async findAll(userId: Types.ObjectId): Promise<WishlistItem[]> {
    const items = await this.wishlistModel.find({ userId }).lean();

    return items.sort((a, b) => {
      // Pending items first, then purchased
      if (a.status !== b.status) {
        return a.status === 'pending' ? -1 : 1;
      }
      // Sort by priority weight
      const weightA = PRIORITY_WEIGHTS[a.priority] ?? 4;
      const weightB = PRIORITY_WEIGHTS[b.priority] ?? 4;
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      // Then by createdAt descending
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }

  async findOne(userId: Types.ObjectId, id: Types.ObjectId): Promise<WishlistItem> {
    const item = await this.wishlistModel.findOne({ _id: id, userId }).lean();
    if (!item) {
      throw new NotFoundException(`Wishlist item with id "${id}" not found`);
    }
    return item;
  }

  async create(userId: Types.ObjectId, dto: CreateWishlistDto): Promise<WishlistItem> {
    const rawPriority = dto.priority ?? dto.type;
    const priority = rawPriority ? normalizePriority(rawPriority) : 'normal';

    if (rawPriority && !priority) {
      throw new BadRequestException('Invalid priority or type');
    }

    if (priority === 'priority') {
      const existing = await this.wishlistModel.findOne({ userId, priority: 'priority' });
      if (existing) {
        throw new ConflictException('A priority wishlist item already exists for this user');
      }
    }

    const created = await this.wishlistModel.create({
      userId,
      name: dto.name,
      amount: dto.amount,
      priority: priority ?? 'normal',
      status: 'pending',
      purchasedAt: null,
    });

    this.logger.log(`Created wishlist item "${dto.name}" for user ${userId}`);
    return created.toObject();
  }

  async update(
    userId: Types.ObjectId,
    id: Types.ObjectId,
    dto: UpdateWishlistDto,
  ): Promise<WishlistItem> {
    const item = await this.wishlistModel.findOne({ _id: id, userId });
    if (!item) {
      throw new NotFoundException(`Wishlist item with id "${id}" not found`);
    }

    if (dto.name !== undefined) item.name = dto.name;
    if (dto.amount !== undefined) item.amount = dto.amount;

    const rawPriority = dto.priority ?? dto.type;
    if (rawPriority !== undefined) {
      const priority = normalizePriority(rawPriority);
      if (!priority) {
        throw new BadRequestException('Invalid priority or type');
      }
      if (priority === 'priority' && item.priority !== 'priority') {
        const existing = await this.wishlistModel.findOne({
          userId,
          priority: 'priority',
          _id: { $ne: id },
        });
        if (existing) {
          throw new ConflictException('A priority wishlist item already exists for this user');
        }
      }
      item.priority = priority;
    }

    if (dto.status !== undefined) {
      if (dto.status === 'purchased' && item.status !== 'purchased') {
        item.status = 'purchased';
        item.purchasedAt = new Date();
      } else if (dto.status === 'pending' && item.status !== 'pending') {
        item.status = 'pending';
        item.purchasedAt = null;
      }
    }

    const updated = await item.save();
    this.logger.log(`Updated wishlist item ${id} for user ${userId}`);
    return updated.toObject();
  }

  async updateType(
    userId: Types.ObjectId,
    id: Types.ObjectId,
    priorityOrType: string,
  ): Promise<WishlistItem> {
    const priority = normalizePriority(priorityOrType);
    if (!priority) {
      throw new BadRequestException('Invalid priority or type');
    }

    const item = await this.wishlistModel.findOne({ _id: id, userId });
    if (!item) {
      throw new NotFoundException(`Wishlist item with id "${id}" not found`);
    }

    if (priority === 'priority' && item.priority !== 'priority') {
      const existing = await this.wishlistModel.findOne({
        userId,
        priority: 'priority',
        _id: { $ne: id },
      });
      if (existing) {
        throw new ConflictException('A priority wishlist item already exists for this user');
      }
    }

    item.priority = priority;
    const updated = await item.save();
    this.logger.log(`Updated wishlist item type/priority ${id} for user ${userId}`);
    return updated.toObject();
  }

  async remove(
    userId: Types.ObjectId,
    id: Types.ObjectId,
  ): Promise<{ deleted: boolean; _id: string }> {
    const item = await this.wishlistModel.findOneAndDelete({ _id: id, userId }).lean();
    if (!item) {
      throw new NotFoundException(`Wishlist item with id "${id}" not found`);
    }

    this.logger.log(`Deleted wishlist item ${id} for user ${userId}`);
    return { deleted: true, _id: id.toString() };
  }

  async purchase(userId: Types.ObjectId, id: Types.ObjectId): Promise<WishlistItem> {
    return this.transactionService.run(async (session) => {
      const item = await this.wishlistModel.findOne({ _id: id, userId }).session(session);
      if (!item) {
        throw new NotFoundException(`Wishlist item with id "${id}" not found`);
      }

      if (item.status === 'purchased') {
        throw new ConflictException(`Wishlist item with id "${id}" is already purchased`);
      }

      item.status = 'purchased';
      item.purchasedAt = new Date();
      await item.save({ session });

      await this.recordLogsService.create(
        {
          userId,
          name: item.name,
          amount: item.amount,
          recordType: 'wishlist',
          action: 'purchased',
          date: new Date(),
          sourceCollection: 'wishlistItems',
          sourceId: item._id,
        },
        session,
      );

      this.logger.log(`Purchased wishlist item ${id} for user ${userId}`);
      return item.toObject();
    });
  }

  async undoPurchase(userId: Types.ObjectId, id: Types.ObjectId): Promise<WishlistItem> {
    return this.transactionService.run(async (session) => {
      const item = await this.wishlistModel.findOne({ _id: id, userId }).session(session);
      if (!item) {
        throw new NotFoundException(`Wishlist item with id "${id}" not found`);
      }

      if (item.status !== 'purchased') {
        throw new ConflictException(`Wishlist item with id "${id}" is not purchased`);
      }

      item.status = 'pending';
      item.purchasedAt = null;
      await item.save({ session });

      await this.recordLogsService.create(
        {
          userId,
          name: item.name,
          amount: item.amount,
          recordType: 'wishlist',
          action: 'adjusted',
          date: new Date(),
          sourceCollection: 'wishlistItems',
          sourceId: item._id,
        },
        session,
      );

      this.logger.log(`Undo purchase for wishlist item ${id} for user ${userId}`);
      return item.toObject();
    });
  }
}
