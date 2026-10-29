import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AccountEntry, AccountEntryDocument } from '../account-entries/schemas/account-entry.schema';
import { DeleteBalanceDto } from './dto/delete-balance.dto';
import { FindEntryRecordsDto } from './dto/find-entry-records.dto';
import { UpdateBalanceDto } from './dto/update-balance.dto';
import { EntryRecord, EntryRecordDocument } from './schemas/entry-record.schema';

function getTodayInTimeZone(timeZone = 'Asia/Manila'): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

@Injectable()
export class EntryRecordsService {
  private readonly logger = new Logger(EntryRecordsService.name);

  constructor(
    @InjectModel(EntryRecord.name)
    private readonly entryRecordModel: Model<EntryRecordDocument>,
    @InjectModel(AccountEntry.name)
    private readonly accountEntryModel: Model<AccountEntryDocument>,
  ) {}

  async findByDate(
    userId: Types.ObjectId,
    dateOrQuery?: string | FindEntryRecordsDto,
  ): Promise<EntryRecord[]> {
    const targetDay =
      typeof dateOrQuery === 'string'
        ? dateOrQuery
        : dateOrQuery?.date || dateOrQuery?.day || dateOrQuery?.recordedDate;

    const filter: Record<string, unknown> = { userId };
    if (targetDay) {
      filter['day'] = targetDay;
    }

    return this.entryRecordModel
      .find(filter)
      .sort({ createdAt: 1 })
      .lean();
  }

  async updateBalance(
    userId: Types.ObjectId,
    dto: UpdateBalanceDto,
  ): Promise<EntryRecord> {
    const day = dto.day || dto.date;
    if (!day) {
      throw new BadRequestException('Either "day" or "date" must be provided in YYYY-MM-DD format');
    }

    // Rule: future dates are rejected
    const today = getTodayInTimeZone();
    if (day > today) {
      throw new BadRequestException('Cannot record balance for a future date');
    }

    // Verify account exists, belongs to user, and is not archived
    const account = await this.accountEntryModel.findOne({
      _id: new Types.ObjectId(dto.accountEntryId),
      userId,
    });
    if (!account) {
      throw new NotFoundException('Account entry not found');
    }
    if (account.archivedAt) {
      throw new BadRequestException('Cannot record balance for an archived account');
    }

    const recordedDate = dto.recordedDate ? new Date(dto.recordedDate) : new Date();

    // Upsert entry record: one balance per account per day
    const updated = await this.entryRecordModel
      .findOneAndUpdate(
        {
          userId,
          accountEntryId: new Types.ObjectId(dto.accountEntryId),
          day,
        },
        {
          $set: {
            balance: dto.balance,
            accountName: account.name,
            accountType: account.type,
            recordedDate,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      )
      .lean();

    this.logger.log(
      `Updated balance for account "${account.name}" on ${day}: ${dto.balance} (user: ${userId})`,
    );
    return updated as EntryRecord;
  }

  async upsertAmount(
    userId: Types.ObjectId,
    dto: UpdateBalanceDto,
  ): Promise<EntryRecord> {
    return this.updateBalance(userId, dto);
  }

  async deleteBalanceById(
    userId: Types.ObjectId,
    id: Types.ObjectId,
  ): Promise<{ deleted: boolean; _id: string }> {
    const record = await this.entryRecordModel
      .findOneAndDelete({ _id: id, userId })
      .lean();

    if (!record) {
      throw new NotFoundException(`Entry record with id "${id}" not found`);
    }

    this.logger.log(`Deleted entry record ${id} for user ${userId}`);
    return { deleted: true, _id: id.toString() };
  }

  async deleteBalance(
    userId: Types.ObjectId,
    dto: DeleteBalanceDto,
  ): Promise<{ deleted: boolean; _id: string }> {
    const day = dto.day || dto.date;
    if (!dto.accountEntryId || !day) {
      throw new BadRequestException(
        'accountEntryId and date (or day) are required to delete a balance',
      );
    }

    const record = await this.entryRecordModel
      .findOneAndDelete({
        userId,
        accountEntryId: new Types.ObjectId(dto.accountEntryId),
        day,
      })
      .lean();

    if (!record) {
      throw new NotFoundException('Entry record not found');
    }

    this.logger.log(
      `Deleted entry record for account ${dto.accountEntryId} on ${day} (user: ${userId})`,
    );
    return { deleted: true, _id: (record as { _id: Types.ObjectId })._id.toString() };
  }
}
