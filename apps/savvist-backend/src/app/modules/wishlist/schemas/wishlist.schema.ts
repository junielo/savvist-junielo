import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type WishlistDocument = HydratedDocument<WishlistItem>;

@Schema({ collection: 'wishlistItems', timestamps: true, versionKey: false })
export class WishlistItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, minlength: 1, maxlength: 80 })
  name!: string;

  @Prop({ type: Number, required: true, min: 0.01 })
  amount!: number;

  @Prop({
    type: String,
    enum: ['asap', 'priority', 'important', 'normal', 'peripheral'],
    default: 'normal',
    required: true,
  })
  priority!: string;

  @Prop({
    type: String,
    enum: ['pending', 'purchased'],
    default: 'pending',
    required: true,
  })
  status!: string;

  @Prop({ type: Date, default: null })
  purchasedAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const WishlistSchema = SchemaFactory.createForClass(WishlistItem);

WishlistSchema.index({ userId: 1, status: 1, priority: 1 });
