import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CurrentUserGuard } from '../../../common/current-user/current-user.guard';
import { UserDocument } from '../../users/schemas/user.schema';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';

describe('MessagesController', () => {
  let controller: MessagesController;
  let service: MessagesService;

  const userId = new Types.ObjectId('665f1c2a9b1e8a0012a1b001');
  const conversationId = new Types.ObjectId('665f1c2a9b1e8a0012a1c001');
  const mockUser = { _id: userId } as UserDocument;

  beforeEach(async () => {
    const mockMessagesService = {
      findAll: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        {
          provide: MessagesService,
          useValue: mockMessagesService,
        },
      ],
    })
      .overrideGuard(CurrentUserGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MessagesController>(MessagesController);
    service = module.get<MessagesService>(MessagesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate findAll to service', async () => {
    const expected = [{ content: 'Hello' }];
    jest.spyOn(service, 'findAll').mockResolvedValue(expected as any);

    const result = await controller.findAll(mockUser, conversationId);
    expect(service.findAll).toHaveBeenCalledWith(userId, conversationId);
    expect(result).toBe(expected);
  });

  it('should delegate create to service', async () => {
    const dto: CreateMessageDto = { content: 'Hi', role: 'user' };
    const expected = { _id: new Types.ObjectId(), ...dto };
    jest.spyOn(service, 'create').mockResolvedValue(expected as any);

    const result = await controller.create(mockUser, conversationId, dto);
    expect(service.create).toHaveBeenCalledWith(userId, conversationId, dto);
    expect(result).toBe(expected);
  });
});
