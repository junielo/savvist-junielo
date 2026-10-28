/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AccountEntry, AccountType } from '../account-entries/schemas/account-entry.schema';
import { EntryRecordsService } from './entry-records.service';
import { EntryRecord } from './schemas/entry-record.schema';

describe('EntryRecordsService', () => {
  let service: EntryRecordsService;
  let mockEntryRecordModel: any;
  let mockAccountEntryModel: any;

  const userId = new Types.ObjectId('665f1c2a9b1e8a0012a1b001');
  const accountEntryId = new Types.ObjectId('665f1c2a9b1e8a0012a1c001');
  const recordId = new Types.ObjectId('665f1c2a9b1e8a0012a1c101');

  beforeEach(async () => {
    mockEntryRecordModel = {
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
    };

    mockAccountEntryModel = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntryRecordsService,
        {
          provide: getModelToken(EntryRecord.name),
          useValue: mockEntryRecordModel,
        },
        {
          provide: getModelToken(AccountEntry.name),
          useValue: mockAccountEntryModel,
        },
      ],
    }).compile();

    service = module.get<EntryRecordsService>(EntryRecordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByUserAndDate', () => {
    it('should filter by day when date is provided', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: recordId, day: '2026-10-23', balance: 1500 }]),
      };
      mockEntryRecordModel.find.mockReturnValue(mockQuery);

      const result = await service.findByUserAndDate(userId, { date: '2026-10-23' });

      expect(mockEntryRecordModel.find).toHaveBeenCalledWith({
        userId,
        day: '2026-10-23',
      });
      expect(result).toHaveLength(1);
    });

    it('should filter by day when day is provided', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: recordId, day: '2026-10-23', balance: 1500 }]),
      };
      mockEntryRecordModel.find.mockReturnValue(mockQuery);

      await service.findByUserAndDate(userId, { day: '2026-10-23' });

      expect(mockEntryRecordModel.find).toHaveBeenCalledWith({
        userId,
        day: '2026-10-23',
      });
    });

    it('should find all for user if no date is provided', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: recordId }]),
      };
      mockEntryRecordModel.find.mockReturnValue(mockQuery);

      await service.findByUserAndDate(userId);

      expect(mockEntryRecordModel.find).toHaveBeenCalledWith({ userId });
    });
  });

  describe('updateBalance', () => {
    it('should successfully update/upsert balance', async () => {
      mockAccountEntryModel.findOne.mockResolvedValue({
        _id: accountEntryId,
        userId,
        name: 'BDO Debit',
        type: AccountType.CASH,
        archivedAt: null,
      });

      const updatedRecord = {
        _id: recordId,
        userId,
        accountEntryId,
        day: '2026-10-20',
        balance: 2000,
        accountName: 'BDO Debit',
        accountType: AccountType.CASH,
      };

      const mockQuery = {
        lean: jest.fn().mockResolvedValue(updatedRecord),
      };
      mockEntryRecordModel.findOneAndUpdate.mockReturnValue(mockQuery);

      const result = await service.updateBalance(userId, {
        accountEntryId: accountEntryId.toString(),
        day: '2026-10-20',
        balance: 2000,
      });

      expect(mockAccountEntryModel.findOne).toHaveBeenCalledWith({
        _id: accountEntryId,
        userId,
      });
      expect(mockEntryRecordModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          userId,
          accountEntryId,
          day: '2026-10-20',
        },
        {
          $set: {
            balance: 2000,
            accountName: 'BDO Debit',
            accountType: AccountType.CASH,
            recordedDate: expect.any(Date),
          },
        },
        expect.objectContaining({ upsert: true, new: true }),
      );
      expect(result.balance).toBe(2000);
    });

    it('should throw BadRequestException when date is missing', async () => {
      await expect(
        service.updateBalance(userId, {
          accountEntryId: accountEntryId.toString(),
          balance: 100,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when date is in the future', async () => {
      await expect(
        service.updateBalance(userId, {
          accountEntryId: accountEntryId.toString(),
          day: '2099-01-01',
          balance: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when account does not exist', async () => {
      mockAccountEntryModel.findOne.mockResolvedValue(null);

      await expect(
        service.updateBalance(userId, {
          accountEntryId: accountEntryId.toString(),
          day: '2026-10-20',
          balance: 100,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when account is archived', async () => {
      mockAccountEntryModel.findOne.mockResolvedValue({
        _id: accountEntryId,
        userId,
        archivedAt: new Date(),
      });

      await expect(
        service.updateBalance(userId, {
          accountEntryId: accountEntryId.toString(),
          day: '2026-10-20',
          balance: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteBalanceById', () => {
    it('should delete record by id', async () => {
      mockEntryRecordModel.findOneAndDelete.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: recordId }),
      });

      const result = await service.deleteBalanceById(userId, recordId);
      expect(mockEntryRecordModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: recordId,
        userId,
      });
      expect(result).toEqual({ deleted: true, _id: recordId.toString() });
    });

    it('should throw NotFoundException if record not found', async () => {
      mockEntryRecordModel.findOneAndDelete.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deleteBalanceById(userId, recordId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteBalance (by query)', () => {
    it('should delete record by accountEntryId and day', async () => {
      mockEntryRecordModel.findOneAndDelete.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: recordId }),
      });

      const result = await service.deleteBalance(userId, {
        accountEntryId: accountEntryId.toString(),
        day: '2026-10-20',
      });

      expect(mockEntryRecordModel.findOneAndDelete).toHaveBeenCalledWith({
        userId,
        accountEntryId,
        day: '2026-10-20',
      });
      expect(result).toEqual({ deleted: true, _id: recordId.toString() });
    });

    it('should throw BadRequestException if params missing', async () => {
      await expect(service.deleteBalance(userId, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if record not found', async () => {
      mockEntryRecordModel.findOneAndDelete.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.deleteBalance(userId, {
          accountEntryId: accountEntryId.toString(),
          day: '2026-10-20',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
