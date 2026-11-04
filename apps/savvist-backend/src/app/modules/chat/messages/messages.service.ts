import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TransactionService } from '../../../database/transaction.service';
import { Message, MessageDocument } from './schemas/message.schema';
import { Conversation, ConversationDocument } from '../conversations/schemas/conversation.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { AgentService } from '../agent/agent.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    private readonly transactionService: TransactionService,
    private readonly agentService: AgentService,
  ) { }

  async findAll(userId: Types.ObjectId, conversationId: Types.ObjectId): Promise<Message[]> {
    const conversation = await this.conversationModel.findOne({ _id: conversationId, userId }).lean();
    if (!conversation) {
      throw new NotFoundException(`Conversation with id "${conversationId}" not found`);
    }

    return this.messageModel
      .find({ conversationId, userId })
      .sort({ createdAt: 1 })
      .lean();
  }

  async send(
    userId: Types.ObjectId,
    conversationId: Types.ObjectId,
    content: string,
  ): Promise<{ userMessage: Message; assistantMessage: Message }> {
    // 1. Persist the user's message first (also verifies conversation ownership).
    //    Its own short transaction: nothing stays open while the agent runs.
    const userMessage = await this.create(userId, conversationId, {
      role: 'user',
      content,
    });

    // 2. Run the graph.
    try {
      const { reply } = await this.agentService.run({
        userId: userId.toString(),
        conversationId: conversationId.toString(),
        text: content,
      });
      const assistantMessage = await this.create(userId, conversationId, {
        role: 'assistant',
        content: reply,
        status: 'complete',
      });
      return { userMessage, assistantMessage };
    } catch {
      // The user's message stays saved. Record a failed reply so history is consistent.
      const assistantMessage = await this.create(userId, conversationId, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        status: 'error',
      });
      return { userMessage, assistantMessage };
    }
  }

  async create(
    userId: Types.ObjectId,
    conversationId: Types.ObjectId,
    dto: CreateMessageDto,
  ): Promise<Message> {
    return this.transactionService.run(async (session) => {
      const conversation = await this.conversationModel
        .findOne({ _id: conversationId, userId })
        .session(session);

      if (!conversation) {
        throw new NotFoundException(`Conversation with id "${conversationId}" not found`);
      }

      const message = new this.messageModel({
        conversationId,
        userId,
        role: dto.role,
        content: dto.content,
        status: dto.status ?? 'complete',
      });

      await message.save({ session });

      conversation.lastMessageAt = new Date();
      await conversation.save({ session });

      return message.toObject();
    });
  }

  async updateStatus(
    userId: Types.ObjectId,
    messageId: Types.ObjectId,
    status: 'complete' | 'streaming' | 'error',
  ): Promise<Message> {
    const message = await this.messageModel.findOne({ _id: messageId, userId });
    if (!message) {
      throw new NotFoundException(`Message with id "${messageId}" not found`);
    }

    message.status = status;
    const updated = await message.save();
    return updated.toObject();
  }
}
