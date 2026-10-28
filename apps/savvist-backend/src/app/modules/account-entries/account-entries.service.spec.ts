/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AccountEntriesService } from './account-entries.service';
import { AccountEntry, AccountType } from './schemas/account-entry.schema';

describe('AccountEntriesService', () => {
  let service: AccountEntriesService;
  let mockModel: any;
  let mockConnection: any;

  const userId = new Types.ObjectId('665f1c2a9b1e8a0012a1b001');
  const accountId = new Types.ObjectId('665f1c2a9b1e8a0012a1c001');

  beforeEach(async () => {
    mockModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      deleteOne: jest.fn(),
    };

    mockConnection = {
      collection: jest.fn().mockReturnValue({
        countDocuments: jest.fn().mockResolvedValue(0),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountEntriesService,
        {
          provide: getModelToken(AccountEntry.name),
          useValue: mockModel,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<AccountEntriesService>(AccountEntriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an account entry', async () => {
      mockModel.findOne.mockResolvedValue(null);
      const createdDoc = {
        _id: accountId,
        userId,
        name: 'BDO Debit',
        type: AccountType.CASH,
        sortOrder: 1,
        archivedAt: null,
        toObject: () => ({
          _id: accountId,
          userId,
          name: 'BDO Debit',
          type: AccountType.CASH,
          sortOrder: 1,
          archivedAt: null,
        }),
      };
      mockModel.create.mockResolvedValue(createdDoc);

      const result = await service.create(userId, {
        name: '  BDO Debit  ',
        type: AccountType.CASH,
        sortOrder: 1,
      });

      expect(mockModel.findOne).toHaveBeenCalledWith({
        userId,
        name: { $regex: /^BDO Debit$/i },
      });
      expect(mockModel.create).toHaveBeenCalledWith({
        userId,
        name: 'BDO Debit',
        type: AccountType.CASH,
        sortOrder: 1,
        archivedAt: null,
      });
      expect(result.name).toBe('BDO Debit');
    });

    it('should throw ConflictException if duplicate name exists', async () => {
      mockModel.findOne.mockResolvedValue({ _id: new Types.ObjectId(), name: 'BDO Debit' });

      await expect(
        service.create(userId, {
          name: 'BDO Debit',
          type: AccountType.CASH,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return active accounts by default', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: accountId, name: 'BDO Debit' }]),
      };
      mockModel.find.mockReturnValue(mockQuery);

      const result = await service.findAll(userId);

      expect(mockModel.find).toHaveBeenCalledWith({ userId, archivedAt: null });
      expect(mockQuery.sort).toHaveBeenCalledWith({ sortOrder: 1, createdAt: 1 });
      expect(result).toHaveLength(1);
    });

    it('should return all accounts including archived when includeArchived is true', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: accountId, name: 'BDO Debit' }]),
      };
      mockModel.find.mockReturnValue(mockQuery);

      await service.findAll(userId, { includeArchived: true });

      expect(mockModel.find).toHaveBeenCalledWith({ userId });
    });
  });

  describe('findOne', () => {
    it('should return account entry if found', async () => {
      const mockQuery = {
        lean: jest.fn().mockResolvedValue({ _id: accountId, name: 'BDO Debit' }),
      };
      mockModel.findOne.mockReturnValue(mockQuery);

      const result = await service.findOne(userId, accountId);
      expect(mockModel.findOne).toHaveBeenCalledWith({ _id: accountId, userId });
      expect(result._id).toEqual(accountId);
    });

    it('should throw NotFoundException if not found', async () => {
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };
      mockModel.findOne.mockReturnValue(mockQuery);

      await expect(service.findOne(userId, accountId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update name and sortOrder', async () => {
      const mockDoc = {
        _id: accountId,
        userId,
        name: 'Old Name',
        type: AccountType.CASH,
        sortOrder: 1,
        save: jest.fn().mockResolvedValue({
          toObject: () => ({
            _id: accountId,
            userId,
            name: 'New Name',
            type: AccountType.CASH,
            sortOrder: 2,
          }),
        }),
      };
      mockModel.findOne
        .mockResolvedValueOnce(mockDoc) // find for account
        .mockResolvedValueOnce(null); // find for duplicate check

      const result = await service.update(userId, accountId, {
        name: 'New Name',
        sortOrder: 2,
      });

      expect(mockDoc.name).toBe('New Name');
      expect(mockDoc.sortOrder).toBe(2);
      expect(result.name).toBe('New Name');
    });

    it('should throw BadRequestException if changing type when records exist', async () => {
      const mockDoc = {
        _id: accountId,
        userId,
        name: 'BDO Debit',
        type: AccountType.CASH,
      };
      mockModel.findOne.mockResolvedValueOnce(mockDoc);
      mockConnection.collection.mockReturnValue({
        countDocuments: jest.fn().mockResolvedValue(5),
      });

      await expect(
        service.update(userId, accountId, {
          type: AccountType.SAVINGS,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow changing type when NO records exist', async () => {
      const mockDoc = {
        _id: accountId,
        userId,
        name: 'BDO Debit',
        type: AccountType.CASH,
        save: jest.fn().mockResolvedValue({
          toObject: () => ({
            _id: accountId,
            userId,
            name: 'BDO Debit',
            type: AccountType.SAVINGS,
          }),
        }),
      };
      mockModel.findOne.mockResolvedValueOnce(mockDoc);
      mockConnection.collection.mockReturnValue({
        countDocuments: jest.fn().mockResolvedValue(0),
      });

      const result = await service.update(userId, accountId, {
        type: AccountType.SAVINGS,
      });

      expect(mockDoc.type).toBe(AccountType.SAVINGS);
      expect(result.type).toBe(AccountType.SAVINGS);
    });

    it('should throw ConflictException if updating to existing name', async () => {
      const mockDoc = {
        _id: accountId,
        userId,
        name: 'Old Name',
        type: AccountType.CASH,
      };
      mockModel.findOne
        .mockResolvedValueOnce(mockDoc)
        .mockResolvedValueOnce({ _id: new Types.ObjectId(), name: 'Taken Name' });

      await expect(
        service.update(userId, accountId, {
          name: 'Taken Name',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should hard delete if no entry records exist', async () => {
      const mockDoc = {
        _id: accountId,
        userId,
      };
      mockModel.findOne.mockResolvedValue(mockDoc);
      mockConnection.collection.mockReturnValue({
        countDocuments: jest.fn().mockResolvedValue(0),
      });
      mockModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await service.remove(userId, accountId);

      expect(mockModel.deleteOne).toHaveBeenCalledWith({ _id: accountId, userId });
      expect(result).toEqual({ deleted: true, _id: accountId.toString() });
    });

    it('should archive by setting archivedAt if entry records exist', async () => {
      const mockDoc = {
        _id: accountId,
        userId,
        archivedAt: null,
        save: jest.fn().mockResolvedValue({
          toObject: () => ({ _id: accountId, userId, archivedAt: new Date() }),
        }),
      };
      mockModel.findOne.mockResolvedValue(mockDoc);
      mockConnection.collection.mockReturnValue({
        countDocuments: jest.fn().mockResolvedValue(3),
      });

      const result = await service.remove(userId, accountId);

      expect(mockDoc.archivedAt).toBeInstanceOf(Date);
      expect(mockDoc.save).toHaveBeenCalled();
      expect(result).toEqual({ archived: true, _id: accountId.toString() });
    });

    it('should throw NotFoundException if account to remove is missing', async () => {
      mockModel.findOne.mockResolvedValue(null);

      await expect(service.remove(userId, accountId)).rejects.toThrow(NotFoundException);
    });
  });
});
