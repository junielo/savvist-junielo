import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { AccountType } from '../../account-entries/schemas/account-entry.schema';

export type EntryRecordDocument = HydratedDocument<EntryRecord>;

@Schema({ collection: 'entryRecords', timestamps: true, versionKey: false })
export class EntryRecord {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'AccountEntry', required: true })
  accountEntryId!: Types.ObjectId;

  @Prop({ type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ })
  day!: string;

  @Prop({ type: Number, required: true, min: 0 })
  balance!: number;

  @Prop({ type: String, required: true, trim: true })
  accountName!: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(AccountType),
  })
  accountType!: AccountType;

  @Prop({ type: Date, required: true, default: () => new Date() })
  recordedDate!: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const EntryRecordSchema = SchemaFactory.createForClass(EntryRecord);

// Unique on (userId, accountEntryId, day)
EntryRecordSchema.index({ userId: 1, accountEntryId: 1, day: 1 }, { unique: true });

// Compound on (userId, day descending)
EntryRecordSchema.index({ userId: 1, day: -1 });

// Query by recordedDate
EntryRecordSchema.index({ userId: 1, recordedDate: -1 });

