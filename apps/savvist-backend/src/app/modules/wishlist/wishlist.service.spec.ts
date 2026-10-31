/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { TransactionService } from '../../database/transaction.service';
import { RecordLogsService } from '../record-logs/record-logs.service';
import { WishlistItem } from './schemas/wishlist.schema';
import { WishlistService } from './wishlist.service';

describe('WishlistService', () => {
  let service: WishlistService;
  let mockWishlistModel: any;
  let mockTransactionService: any;
  let mockRecordLogsService: any;

  const userId = new Types.ObjectId('665f1c2a9b1e8a0012a1b001');
  const itemId = new Types.ObjectId('665f1c2a9b1e8a0012a1d001');

  beforeEach(async () => {
    mockWishlistModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndDelete: jest.fn(),
    };

    mockTransactionService = {
      run: jest.fn((work) => work({} as any)),
    };

    mockRecordLogsService = {
      create: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        {
          provide: getModelToken(WishlistItem.name),
          useValue: mockWishlistModel,
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

    service = module.get<WishlistService>(WishlistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return sorted wishlist items', async () => {
      const items = [
        { _id: itemId, name: 'Normal Item', status: 'pending', priority: 'normal', createdAt: new Date() },
        { _id: new Types.ObjectId(), name: 'ASAP Item', status: 'pending', priority: 'asap', createdAt: new Date() },
      ];
      mockWishlistModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(items),
      });

      const result = await service.findAll(userId);
      expect(mockWishlistModel.find).toHaveBeenCalledWith({ userId });
      expect(result[0].priority).toBe('asap');
    });
  });

  describe('findOne', () => {
    it('should return item if found', async () => {
      mockWishlistModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: itemId, name: 'Keyboard' }),
      });

      const result = await service.findOne(userId, itemId);
      expect(result.name).toBe('Keyboard');
    });

    it('should throw NotFoundException if not found', async () => {
      mockWishlistModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(userId, itemId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('purchase', () => {
    it('should purchase item and write a purchased log', async () => {
      const mockItem = {
        _id: itemId,
        userId,
        name: 'Keyboard',
        amount: 5000,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true),
        toObject: function () { return this; },
      };
      mockWishlistModel.findOne.mockReturnValue({
        session: jest.fn().mockResolvedValue(mockItem),
      });

      const result = await service.purchase(userId, itemId);
      expect(result.status).toBe('purchased');
      expect(mockRecordLogsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          recordType: 'wishlist',
          action: 'purchased',
          sourceCollection: 'wishlistItems',
          sourceId: itemId,
        }),
        expect.any(Object),
      );
    });

    it('should throw ConflictException if already purchased and write no log', async () => {
      const mockItem = {
        _id: itemId,
        userId,
        name: 'Keyboard',
        amount: 5000,
        status: 'purchased',
      };
      mockWishlistModel.findOne.mockReturnValue({
        session: jest.fn().mockResolvedValue(mockItem),
      });

      await expect(service.purchase(userId, itemId)).rejects.toThrow(ConflictException);
      expect(mockRecordLogsService.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if item not found and write no log', async () => {
      mockWishlistModel.findOne.mockReturnValue({
        session: jest.fn().mockResolvedValue(null),
      });

      await expect(service.purchase(userId, itemId)).rejects.toThrow(NotFoundException);
      expect(mockRecordLogsService.create).not.toHaveBeenCalled();
    });
  });

  describe('undoPurchase', () => {
    it('should undo purchase and write an adjusted log', async () => {
      const mockItem = {
        _id: itemId,
        userId,
        name: 'Keyboard',
        amount: 5000,
        status: 'purchased',
        purchasedAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
        toObject: function () { return this; },
      };
      mockWishlistModel.findOne.mockReturnValue({
        session: jest.fn().mockResolvedValue(mockItem),
      });

      const result = await service.undoPurchase(userId, itemId);
      expect(result.status).toBe('pending');
      expect(mockRecordLogsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          recordType: 'wishlist',
          action: 'adjusted',
          sourceCollection: 'wishlistItems',
          sourceId: itemId,
        }),
        expect.any(Object),
      );
    });

    it('should throw ConflictException if item is pending and write no log', async () => {
      const mockItem = {
        _id: itemId,
        userId,
        name: 'Keyboard',
        amount: 5000,
        status: 'pending',
      };
      mockWishlistModel.findOne.mockReturnValue({
        session: jest.fn().mockResolvedValue(mockItem),
      });

      await expect(service.undoPurchase(userId, itemId)).rejects.toThrow(ConflictException);
      expect(mockRecordLogsService.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if item not found and write no log', async () => {
      mockWishlistModel.findOne.mockReturnValue({
        session: jest.fn().mockResolvedValue(null),
      });

      await expect(service.undoPurchase(userId, itemId)).rejects.toThrow(NotFoundException);
      expect(mockRecordLogsService.create).not.toHaveBeenCalled();
    });
  });

  describe('create with unique priority check', () => {
    it('should create wishlist item successfully', async () => {
      const dto = { name: 'Keyboard', amount: 5000, priority: 'important' };
      const createdDoc = {
        _id: itemId,
        userId,
        ...dto,
        status: 'pending',
        purchasedAt: null,
        toObject: () => ({ _id: itemId, userId, ...dto, status: 'pending', purchasedAt: null }),
      };

      mockWishlistModel.create.mockResolvedValue(createdDoc);

      const result = await service.create(userId, dto);
      expect(result.name).toBe('Keyboard');
    });

    it('should throw ConflictException if priority already exists', async () => {
      const dto = { name: 'New Priority Item', amount: 5000, priority: 'priority' };
      mockWishlistModel.findOne.mockResolvedValue({ _id: new Types.ObjectId(), priority: 'priority' });

      await expect(service.create(userId, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('updateType and unique priority validation', () => {
    it('should update item type successfully', async () => {
      const mockDoc = {
        _id: itemId,
        userId,
        priority: 'normal',
        save: jest.fn().mockResolvedValue({
          toObject: () => ({ _id: itemId, priority: 'asap' }),
        }),
      };
      mockWishlistModel.findOne.mockResolvedValueOnce(mockDoc);

      const result = await service.updateType(userId, itemId, 'asap');
      expect(result.priority).toBe('asap');
    });

    it('should throw ConflictException if setting priority to "priority" when another exists', async () => {
      const mockDoc = {
        _id: itemId,
        userId,
        priority: 'normal',
      };
      mockWishlistModel.findOne
        .mockResolvedValueOnce(mockDoc)
        .mockResolvedValueOnce({ _id: new Types.ObjectId(), priority: 'priority' });

      await expect(service.updateType(userId, itemId, 'priority')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should delete wishlist item successfully', async () => {
      mockWishlistModel.findOneAndDelete.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: itemId }),
      });

      const result = await service.remove(userId, itemId);
      expect(result).toEqual({ deleted: true, _id: itemId.toString() });
    });

    it('should throw NotFoundException if item to delete not found', async () => {
      mockWishlistModel.findOneAndDelete.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove(userId, itemId)).rejects.toThrow(NotFoundException);
    });
  });
});
