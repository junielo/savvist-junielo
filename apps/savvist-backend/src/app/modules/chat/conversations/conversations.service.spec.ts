/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ConversationsService } from './conversations.service';
import { Conversation } from './schemas/conversation.schema';
import { Message } from '../messages/schemas/message.schema';
import { TransactionService } from '../../../database/transaction.service';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let mockConversationModel: any;
  let mockMessageModel: any;
  let mockTransactionService: any;

  const userId = new Types.ObjectId('665f1c2a9b1e8a0012a1b001');
  const conversationId = new Types.ObjectId('665f1c2a9b1e8a0012a1d001');

  beforeEach(async () => {
    mockConversationModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      deleteOne: jest.fn(),
    };

    mockMessageModel = {
      deleteMany: jest.fn(),
    };

    mockTransactionService = {
      run: jest.fn((work) => work({} as any)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: getModelToken(Conversation.name),
          useValue: mockConversationModel,
        },
        {
          provide: getModelToken(Message.name),
          useValue: mockMessageModel,
        },
        {
          provide: TransactionService,
          useValue: mockTransactionService,
        },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all conversations for user', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: conversationId, title: 'Chat 1' }]),
      };
      mockConversationModel.find.mockReturnValue(mockQuery);

      const result = await service.findAll(userId);
      expect(result).toHaveLength(1);
      expect(mockConversationModel.find).toHaveBeenCalledWith({ userId });
    });
  });
});
