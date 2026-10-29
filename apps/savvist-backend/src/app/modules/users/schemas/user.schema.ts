import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ collection: 'users', timestamps: true, versionKey: false })
export class User {
  @Prop({ required: true, trim: true, minlength: 1, maxlength: 60 })
  displayName!: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop({ select: false })
  passwordHash?: string;

  @Prop({
    required: true,
    default: 0,
    min: 0,
  })
  baseSalary!: number;

  @Prop({ min: 1, max: 31, default: 15 })
  salaryDay1?: number;

  @Prop({ min: 1, max: 31, default: 28 })
  salaryDay2?: number;

  @Prop({ required: true, default: true })
  isUnemployed!: boolean;

  @Prop({ required: true, default: 'PHP' })
  currency!: string;

  @Prop({ required: true, default: 'en-PH' })
  locale!: string;

  @Prop({ required: true, default: 'Asia/Manila' })
  timeZone!: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Unique only when email exists, so users without an email don't collide.
UserSchema.index({ email: 1 }, { unique: true, sparse: true });