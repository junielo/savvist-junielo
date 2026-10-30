import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type DailyMetricDocument = HydratedDocument<DailyMetric>;

@Schema({ collection: 'dailyMetrics', timestamps: true, versionKey: false })
export class DailyMetric {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  day!: string;

  @Prop({ type: Number, required: true, min: 0 })
  totalFund!: number;

  @Prop({ type: Number, required: true, min: 0 })
  actualCash!: number;

  @Prop({ type: Number, required: true, min: 0, max: 1 })
  health!: number;

  @Prop({ type: Number, required: true, min: 0, max: 1 })
  growth!: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const DailyMetricSchema = SchemaFactory.createForClass(DailyMetric);

DailyMetricSchema.index({ userId: 1, day: 1 }, { unique: true });
DailyMetricSchema.index({ userId: 1, day: -1 });
