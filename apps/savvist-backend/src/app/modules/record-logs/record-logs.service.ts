import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { RecordLog, RecordLogDocument } from './schemas/record-log.schema';

@Injectable()
export class RecordLogsService {
  constructor(
    @InjectModel(RecordLog.name)
    private readonly recordLogModel: Model<RecordLogDocument>,
  ) {}

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

  async findOne(
    filter: { userId: Types.ObjectId; sourceCollection: string; name: string },
    session?: ClientSession,
  ): Promise<RecordLogDocument | null> {
    return this.recordLogModel.findOne(filter).session(session ?? null);
  }
}
