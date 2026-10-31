import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type RecordLogDocument = HydratedDocument<RecordLog>;

@Schema({ collection: 'recordLogs', timestamps: { createdAt: true, updatedAt: false }, versionKey: false })
export class RecordLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: Number, required: true })
  amount!: number;

  @Prop({ type: String, required: true })
  recordType!: string;

  @Prop({ type: String, required: true })
  action!: string;

  @Prop({ type: Date, required: true, default: () => new Date() })
  date!: Date;

  @Prop({ type: String, required: true })
  sourceCollection!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  sourceId!: Types.ObjectId;

  @Prop({ type: Number })
  previousAmount?: number;

  @Prop({ type: String, required: false, match: /^\d{4}-\d{2}-\d{2}$/ })
  effectiveDay?: string;

  createdAt?: Date;
}

export const RecordLogSchema = SchemaFactory.createForClass(RecordLog);

RecordLogSchema.index({ userId: 1, date: -1 });
RecordLogSchema.index({ userId: 1, recordType: 1, date: -1 });
RecordLogSchema.index({ userId: 1, sourceId: 1 });
