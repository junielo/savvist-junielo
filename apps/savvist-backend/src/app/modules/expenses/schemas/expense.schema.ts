import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type ExpenseDocument = HydratedDocument<Expense>;

@Schema({ collection: 'expenses', timestamps: true, versionKey: false })
export class Expense {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, minlength: 1, maxlength: 80 })
  name!: string;

  @Prop({ type: Number, required: true, min: 0.01 })
  amount!: number;

  @Prop({ type: Number, required: true, min: 1, max: 31 })
  dayOfMonth!: number;

  @Prop({ type: [Number], required: true, default: [] })
  months!: number[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);

ExpenseSchema.index({ userId: 1, dayOfMonth: 1 });
ExpenseSchema.index({ userId: 1, months: 1 });
