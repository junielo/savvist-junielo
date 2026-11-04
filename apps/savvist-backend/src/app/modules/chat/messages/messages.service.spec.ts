/* eslint-disable @typescript-eslint/no-explicit-any */
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MessagesService } from './messages.service';
import { Message } from './schemas/message.schema';
import { Conversation } from '../conversations/schemas/conversation.schema';
import { TransactionService } from '../../../database/transaction.service';
import { AgentService } from '../agent/agent.service';

describe('MessagesService', () => {
  let service: MessagesService;
  let mockMessageModel: any;
  let mockConversationModel: any;
  let mockTransactionService: any;

  const userId = new Types.ObjectId('665f1c2a9b1e8a0012a1b001');
  const conversationId = new Types.ObjectId('665f1c2a9b1e8a0012a1c001');
  const messageId = new Types.ObjectId('665f1c2a9b1e8a0012a1d001');

  beforeEach(async () => {
    mockMessageModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: messageId,
      save: jest.fn().mockResolvedValue(true),
      toObject: function () {
        return { _id: messageId, ...dto };
      },
    }));
    mockMessageModel.find = jest.fn();
    mockMessageModel.findOne = jest.fn();

    mockConversationModel = {
      findOne: jest.fn(),
    };

    mockTransactionService = {
      run: jest.fn((cb) => cb({})),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: getModelToken(Message.name), useValue: mockMessageModel },
        { provide: getModelToken(Conversation.name), useValue: mockConversationModel },
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: AgentService, useValue: { processMessage: jest.fn() } },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should throw NotFoundException if conversation does not exist', async () => {
      mockConversationModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findAll(userId, conversationId)).rejects.toThrow(NotFoundException);
    });

    it('should return messages if conversation exists', async () => {
      mockConversationModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: conversationId, userId }),
      });

      const messagesList = [{ _id: messageId, content: 'Hello', role: 'user' }];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(messagesList),
      };
      mockMessageModel.find.mockReturnValue(mockQuery);

      const result = await service.findAll(userId, conversationId);
      expect(result).toEqual(messagesList);
      expect(mockMessageModel.find).toHaveBeenCalledWith({ conversationId, userId });
    });
  });

  describe('create', () => {
    it('should throw NotFoundException if conversation does not exist', async () => {
      const mockConvQuery = {
        session: jest.fn().mockResolvedValue(null),
      };
      mockConversationModel.findOne.mockReturnValue(mockConvQuery);

      await expect(
        service.create(userId, conversationId, { content: 'Hi', role: 'user' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create message and update conversation lastMessageAt', async () => {
      const mockConv = {
        _id: conversationId,
        userId,
        lastMessageAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };
      mockConversationModel.findOne.mockReturnValue({
        session: jest.fn().mockResolvedValue(mockConv),
      });

      const dto = { content: 'Hello AI', role: 'user' as const };
      const result = await service.create(userId, conversationId, dto);

      expect(result).toBeDefined();
      expect(result.content).toBe('Hello AI');
      expect(mockConv.save).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should throw NotFoundException if message not found', async () => {
      mockMessageModel.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus(userId, messageId, 'complete'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update message status and save', async () => {
      const mockMessage = {
        _id: messageId,
        userId,
        status: 'streaming',
        save: jest.fn().mockResolvedValue({
          toObject: () => ({ _id: messageId, status: 'complete' }),
        }),
      };
      mockMessageModel.findOne.mockResolvedValue(mockMessage);

      const result = await service.updateStatus(userId, messageId, 'complete');
      expect(result.status).toBe('complete');
      expect(mockMessage.status).toBe('complete');
      expect(mockMessage.save).toHaveBeenCalled();
    });
  });
});
