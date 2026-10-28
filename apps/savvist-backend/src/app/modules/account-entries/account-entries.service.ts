import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { CreateAccountEntryDto } from './dto/create-account-entry.dto';
import { FindAccountEntriesDto } from './dto/find-account-entries.dto';
import { UpdateAccountEntryDto } from './dto/update-account-entry.dto';
import { AccountEntry, AccountEntryDocument } from './schemas/account-entry.schema';

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class AccountEntriesService {
  private readonly logger = new Logger(AccountEntriesService.name);

  constructor(
    @InjectModel(AccountEntry.name)
    private readonly accountEntryModel: Model<AccountEntryDocument>,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async create(userId: Types.ObjectId, dto: CreateAccountEntryDto): Promise<AccountEntry> {
    const trimmedName = dto.name.trim();

    const existing = await this.accountEntryModel.findOne({
      userId,
      name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') },
    });

    if (existing) {
      throw new ConflictException(`An account named "${trimmedName}" already exists`);
    }

    const created = await this.accountEntryModel.create({
      userId,
      name: trimmedName,
      type: dto.type,
      sortOrder: dto.sortOrder,
      archivedAt: null,
    });

    this.logger.log(`Created account entry "${trimmedName}" (${dto.type}) for user ${userId}`);
    return created.toObject();
  }

  async findAll(
    userId: Types.ObjectId,
    query?: FindAccountEntriesDto,
  ): Promise<AccountEntry[]> {
    const filter: Record<string, unknown> = { userId };
    if (!query?.includeArchived) {
      filter['archivedAt'] = null;
    }

    return this.accountEntryModel
      .find(filter)
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
  }

  async findOne(userId: Types.ObjectId, id: Types.ObjectId): Promise<AccountEntry> {
    const account = await this.accountEntryModel
      .findOne({ _id: id, userId })
      .lean();

    if (!account) {
      throw new NotFoundException(`Account entry with id "${id}" not found`);
    }

    return account;
  }

  async update(
    userId: Types.ObjectId,
    id: Types.ObjectId,
    dto: UpdateAccountEntryDto,
  ): Promise<AccountEntry> {
    const account = await this.accountEntryModel.findOne({ _id: id, userId });
    if (!account) {
      throw new NotFoundException(`Account entry with id "${id}" not found`);
    }

    // Rule: type is locked once any entryRecords exist
    if (dto.type !== undefined && dto.type !== account.type) {
      const hasRecords = await this.connection
        .collection('entryRecords')
        .countDocuments({ accountEntryId: id }, { limit: 1 });

      if (hasRecords > 0) {
        throw new BadRequestException(
          'Account type cannot be changed once daily records exist',
        );
      }
      account.type = dto.type;
    }

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (trimmedName.toLowerCase() !== account.name.toLowerCase()) {
        const existing = await this.accountEntryModel.findOne({
          userId,
          _id: { $ne: id },
          name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') },
        });

        if (existing) {
          throw new ConflictException(`An account named "${trimmedName}" already exists`);
        }
      }
      account.name = trimmedName;
    }

    if (dto.sortOrder !== undefined) {
      account.sortOrder = dto.sortOrder;
    }

    const updated = await account.save();
    this.logger.log(`Updated account entry ${id} for user ${userId}`);
    return updated.toObject();
  }

  async remove(
    userId: Types.ObjectId,
    id: Types.ObjectId,
  ): Promise<{ deleted?: boolean; archived?: boolean; _id: string }> {
    const account = await this.accountEntryModel.findOne({ _id: id, userId });
    if (!account) {
      throw new NotFoundException(`Account entry with id "${id}" not found`);
    }

    // Rule: hard delete only if no daily records exist; otherwise archive
    const hasRecords = await this.connection
      .collection('entryRecords')
      .countDocuments({ accountEntryId: id }, { limit: 1 });

    if (hasRecords > 0) {
      account.archivedAt = new Date();
      await account.save();
      this.logger.log(`Archived account entry ${id} for user ${userId}`);
      return { archived: true, _id: id.toString() };
    }

    await this.accountEntryModel.deleteOne({ _id: id, userId });
    this.logger.log(`Deleted account entry ${id} for user ${userId}`);
    return { deleted: true, _id: id.toString() };
  }
}
