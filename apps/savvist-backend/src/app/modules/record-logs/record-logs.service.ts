import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { RecordLog, RecordLogDocument } from './schemas/record-log.schema';

@Injectable()
export class RecordLogsService {
  constructor(
    @InjectModel(RecordLog.name)
    private readonly recordLogModel: Model<RecordLogDocument>,
  ) { }

  async create(
    data: {
      userId: Types.ObjectId;
      name: string;
      amount: number;
      recordType: string;
      action: string;
      date?: Date;
      sourceCollection: string;
      sourceId: Types.ObjectId;
      previousAmount?: number;
      effectiveDay?: string;
    },
    session?: ClientSession,
  ): Promise<RecordLog> {
    const created = new this.recordLogModel(data);
    return created.save({ session });
  }

  async getAll(userId: Types.ObjectId): Promise<RecordLog[]> {
    return this.recordLogModel
      .find({ userId })
      .sort({ date: -1, createdAt: -1 })
      .lean();
  }

  async findAll(userId: Types.ObjectId): Promise<RecordLog[]> {
    return this.getAll(userId);
  }

  // Search and limit run in the query, so older logs can still be found.
  async search(
    userId: Types.ObjectId,
    opts: { search?: string; limit?: number } = {},
  ): Promise<RecordLog[]> {
    const rx = opts.search
      ? new RegExp(opts.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      : null;

    return this.recordLogModel
      .find({
        userId,
        ...(rx ? { $or: [{ name: rx }, { sourceCollection: rx }, { action: rx }] } : {}),
      })
      .sort({ date: -1, createdAt: -1 })
      .limit(opts.limit ?? 20)
      .lean();
  }

  async findOne(
    filter: { userId: Types.ObjectId; sourceCollection: string; name: string },
    session?: ClientSession,
  ): Promise<RecordLogDocument | null> {
    return this.recordLogModel.findOne(filter).session(session ?? null);
  }
}