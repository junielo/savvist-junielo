import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CurrentUserGuard } from '../../../common/current-user/current-user.guard';
import { UserDocument } from '../../users/schemas/user.schema';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

describe('ConversationsController', () => {
  let controller: ConversationsController;
  let service: ConversationsService;

  const userId = new Types.ObjectId('665f1c2a9b1e8a0012a1b001');
  const mockUser = { _id: userId } as UserDocument;

  beforeEach(async () => {
    const mockConversationsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [
        {
          provide: ConversationsService,
          useValue: mockConversationsService,
        },
      ],
    })
      .overrideGuard(CurrentUserGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ConversationsController>(ConversationsController);
    service = module.get<ConversationsService>(ConversationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate findAll to service', async () => {
    const expected = [{ title: 'Chat 1' }];
    jest.spyOn(service, 'findAll').mockResolvedValue(expected as any);

    const result = await controller.findAll(mockUser);
    expect(service.findAll).toHaveBeenCalledWith(userId);
    expect(result).toBe(expected);
  });
});
