import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TransactionService } from '../../../database/transaction.service';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { Message, MessageDocument } from '../messages/schemas/message.schema';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    private readonly transactionService: TransactionService,
  ) {}

  async findAll(userId: Types.ObjectId): Promise<Conversation[]> {
    return this.conversationModel
      .find({ userId })
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .lean();
  }

  async findOne(userId: Types.ObjectId, id: Types.ObjectId): Promise<Conversation> {
    const conversation = await this.conversationModel.findOne({ _id: id, userId }).lean();
    if (!conversation) {
      throw new NotFoundException(`Conversation with id "${id}" not found`);
    }
    return conversation;
  }

  async create(userId: Types.ObjectId, dto: CreateConversationDto): Promise<Conversation> {
    const conversation = new this.conversationModel({
      userId,
      title: dto.title ?? 'New chat',
      lastMessageAt: new Date(),
    });
    await conversation.save();
    return conversation.toObject();
  }

  async update(userId: Types.ObjectId, id: Types.ObjectId, dto: UpdateConversationDto): Promise<Conversation> {
    const conversation = await this.conversationModel.findOne({ _id: id, userId });
    if (!conversation) {
      throw new NotFoundException(`Conversation with id "${id}" not found`);
    }

    if (dto.title !== undefined) {
      conversation.title = dto.title;
    }

    const updated = await conversation.save();
    return updated.toObject();
  }

  async remove(userId: Types.ObjectId, id: Types.ObjectId): Promise<{ deleted: boolean; _id: string }> {
    return this.transactionService.run(async (session) => {
      const conversation = await this.conversationModel.findOne({ _id: id, userId }).session(session);
      if (!conversation) {
        throw new NotFoundException(`Conversation with id "${id}" not found`);
      }

      await this.messageModel.deleteMany({ conversationId: id, userId }).session(session);
      await this.conversationModel.deleteOne({ _id: id, userId }).session(session);

      return { deleted: true, _id: id.toString() };
    });
  }
}
