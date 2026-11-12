/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { WishlistSeederService } from './wishlist-seeder.service';
import { WishlistItem } from '../schemas/wishlist.schema';
import { UsersService } from '../../users/users.service';
import { TransactionService } from '../../../database/transaction.service';
import { RecordLogsService } from '../../record-logs/record-logs.service';

describe('WishlistSeederService', () => {
  let service: WishlistSeederService;
  let mockWishlistModel: any;
  let mockUsersService: any;
  let mockTransactionService: any;
  let mockRecordLogsService: any;

  const userId = new Types.ObjectId('665f1c2a9b1e8a0012a1b001');

  beforeEach(async () => {
    mockWishlistModel = {
      countDocuments: jest.fn(),
      create: jest.fn().mockImplementation((docs) => docs.map((d: any) => ({ ...d, _id: new Types.ObjectId() }))),
    };

    mockUsersService = {
      findCurrent: jest.fn().mockResolvedValue({ _id: userId, displayName: 'John Doe' }),
    };

    mockTransactionService = {
      run: jest.fn((work) => work({} as any)),
    };

    mockRecordLogsService = {
      create: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistSeederService,
        {
          provide: getModelToken(WishlistItem.name),
          useValue: mockWishlistModel,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: TransactionService,
          useValue: mockTransactionService,
        },
        {
          provide: RecordLogsService,
          useValue: mockRecordLogsService,
        },
      ],
    }).compile();

    service = module.get<WishlistSeederService>(WishlistSeederService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should not seed if wishlist items already exist', async () => {
    mockWishlistModel.countDocuments.mockResolvedValue(5);

    await service.onModuleInit();

    expect(mockWishlistModel.create).not.toHaveBeenCalled();
  });

  it('should seed wishlist items and record logs if wishlist is empty', async () => {
    mockWishlistModel.countDocuments.mockResolvedValue(0);

    await service.onModuleInit();

    expect(mockWishlistModel.countDocuments).toHaveBeenCalledWith({ userId, status: 'purchased' });
    expect(mockWishlistModel.create).toHaveBeenCalledTimes(11);
    expect(mockRecordLogsService.create).toHaveBeenCalledTimes(11);
  });
});
