import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export enum AccountType {
  CASH = 'cash',
  CREDIT = 'credit',
  SAVINGS = 'savings',
}

export type AccountEntryDocument = HydratedDocument<AccountEntry>;

@Schema({ collection: 'accountEntries', timestamps: true, versionKey: false })
export class AccountEntry {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, minlength: 1, maxlength: 60 })
  name!: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(AccountType),
  })
  type!: AccountType;

  @Prop({ type: Date, default: null })
  archivedAt?: Date | null;

  @Prop({ type: Number })
  sortOrder?: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AccountEntrySchema = SchemaFactory.createForClass(AccountEntry);

// Unique account name per user (case-insensitive)
AccountEntrySchema.index(
  { userId: 1, name: 1 },
  {
    unique: true,
    collation: { locale: 'en', strength: 2 },
  },
);

// List active accounts in dialog
AccountEntrySchema.index({ userId: 1, archivedAt: 1 });

