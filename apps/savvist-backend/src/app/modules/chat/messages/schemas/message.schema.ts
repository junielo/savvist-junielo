import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ collection: 'messages', timestamps: { createdAt: true, updatedAt: false }, versionKey: false })
export class Message {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Conversation', required: true, index: true })
  conversationId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ['user', 'assistant'] })
  role!: 'user' | 'assistant';

  @Prop({ type: String, required: true, trim: true, minlength: 1, maxlength: 8000 })
  content!: string;

  @Prop({ type: String, required: true, enum: ['complete', 'streaming', 'error'], default: 'complete' })
  status!: 'complete' | 'streaming' | 'error';

  createdAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ conversationId: 1, createdAt: 1 });
