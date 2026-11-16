/* eslint-disable @typescript-eslint/no-explicit-any */
import { WriteTool } from './write.tool';
import { Types } from 'mongoose';

describe('WriteTool', () => {
  let writeTool: WriteTool;
  let mockAccountEntriesService: any;
  let mockEntryRecordsService: any;
  let mockUsersService: any;
  let mockObservability: any;

  const userId = new Types.ObjectId('6adf58efb1a87dfd54b8d3a3');
  const bdoId = new Types.ObjectId('6adf58efb1a87dfd54b8d3b1');
  const gcreditId = new Types.ObjectId('6adf58efb1a87dfd54b8d3b2');

  beforeEach(() => {
    mockAccountEntriesService = {
      findAll: jest.fn().mockResolvedValue([
        { _id: bdoId, name: 'BDO Debit', type: 'cash' },
        { _id: gcreditId, name: 'GCredit', type: 'credit' },
      ]),
    };
    mockEntryRecordsService = {
      findByDate: jest.fn().mockResolvedValue([]),
      updateBalance: jest.fn().mockImplementation((_uid, dto) =>
        Promise.resolve({
          _id: new Types.ObjectId(),
          userId,
          accountEntryId: new Types.ObjectId(dto.accountEntryId),
          day: dto.day,
          balance: dto.balance,
        }),
      ),
    };
    mockUsersService = {
      findById: jest.fn().mockResolvedValue({
        _id: userId,
        baseSalary: 30000,
        isUnemployed: false,
      }),
      updateUser: jest.fn().mockImplementation((_uid, dto) =>
        Promise.resolve({
          _id: userId,
          baseSalary: dto.baseSalary,
          isUnemployed: dto.isUnemployed,
        }),
      ),
    };
    mockObservability = {
      setToolCall: jest.fn(),
    };

    writeTool = new WriteTool(
      mockAccountEntriesService,
      mockEntryRecordsService,
      mockUsersService,
      mockObservability,
    );
  });

  it('successfully creates balance when no prior record exists for the day', async () => {
    const result = await writeTool.updateBalance(userId, {
      accountName: 'BDO Debit',
      amount: 35000,
      date: '2026-10-31',
    });

    expect(result.success).toBe(true);
    if ('success' in result) {
      expect(result.action).toBe('created');
      expect(result.message).toContain('Successfully created balance for BDO Debit');
    }
    expect(mockEntryRecordsService.updateBalance).toHaveBeenCalledWith(userId, {
      accountEntryId: String(bdoId),
      balance: 35000,
      day: '2026-10-31',
    });
    expect(mockObservability.setToolCall).toHaveBeenCalledWith(
      'write-tool',
      expect.objectContaining({ method: 'updateBalance' }),
    );
  });

  it('successfully creates balances for multiple accounts in a single batch', async () => {
    const result = await writeTool.updateBalance(userId, {
      entries: [
        { accountName: 'BDO Debit', amount: 45000 },
        { accountName: 'GCredit', amount: 11000 },
      ],
      date: '2026-11-16',
    });

    expect(result.success).toBe(true);
    if ('success' in result) {
      expect(result.message).toContain('BDO Debit: ₱45,000.00');
      expect(result.message).toContain('GCredit: ₱11,000.00');
    }
    expect(mockEntryRecordsService.updateBalance).toHaveBeenCalledTimes(2);
  });

  it('returns a conflict when record exists with different balance and confirmedReplace is false', async () => {
    mockEntryRecordsService.findByDate.mockResolvedValue([
      { accountEntryId: bdoId, day: '2026-10-31', balance: 30000 },
    ]);

    const result = await writeTool.updateBalance(userId, {
      accountName: 'BDO Debit',
      amount: 35000,
      date: '2026-10-31',
      confirmedReplace: false,
    });

    expect('conflict' in result && result.conflict).toBe(true);
    if ('conflict' in result) {
      expect(result.existingBalance).toBe(30000);
      expect(result.proposedBalance).toBe(35000);
      expect(result.accountName).toBe('BDO Debit');
      expect(result.day).toBe('2026-10-31');
    }
    expect(mockEntryRecordsService.updateBalance).not.toHaveBeenCalled();
  });

  it('detects multiple conflicts across a batch when balances already exist', async () => {
    mockEntryRecordsService.findByDate.mockResolvedValue([
      { accountEntryId: bdoId, day: '2026-11-16', balance: 35000 },
      { accountEntryId: gcreditId, day: '2026-11-16', balance: 5000 },
    ]);

    const result = await writeTool.updateBalance(userId, {
      entries: [
        { accountName: 'BDO Debit', amount: 45000 },
        { accountName: 'GCredit', amount: 11000 },
      ],
      date: '2026-11-16',
      confirmedReplace: false,
    });

    expect('conflict' in result && result.conflict).toBe(true);
    if ('conflict' in result) {
      expect(result.conflicts).toHaveLength(2);
      expect(result.conflicts[0].existingBalance).toBe(35000);
      expect(result.conflicts[1].existingBalance).toBe(5000);
    }
    expect(mockEntryRecordsService.updateBalance).not.toHaveBeenCalled();
  });

  it('updates balance when conflict was already confirmed by user (confirmedReplace: true)', async () => {
    mockEntryRecordsService.findByDate.mockResolvedValue([
      { accountEntryId: bdoId, day: '2026-10-31', balance: 30000 },
    ]);

    const result = await writeTool.updateBalance(userId, {
      accountName: 'BDO Debit',
      amount: 35000,
      date: '2026-10-31',
      confirmedReplace: true,
    });

    expect(result.success).toBe(true);
    if ('success' in result) {
      expect(result.action).toBe('updated');
      expect(result.message).toContain('Successfully updated balance for BDO Debit');
    }
    expect(mockEntryRecordsService.updateBalance).toHaveBeenCalled();
  });

  it('returns error when account does not exist', async () => {
    const result = await writeTool.updateBalance(userId, {
      accountName: 'NonExistentBank',
      amount: 1000,
    });

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('not found');
    }
    expect(mockEntryRecordsService.updateBalance).not.toHaveBeenCalled();
  });

  describe('updateSalary', () => {
    it('successfully updates base salary to a new amount', async () => {
      const result = await writeTool.updateSalary(userId, { baseSalary: 50000 });

      expect(result.success).toBe(true);
      if ('success' in result) {
        expect(result.message).toContain('₱50,000.00');
      }
      expect(mockUsersService.updateUser).toHaveBeenCalledWith(userId, {
        baseSalary: 50000,
        isUnemployed: false,
      });
      expect(mockObservability.setToolCall).toHaveBeenCalledWith(
        'write-tool',
        expect.objectContaining({ method: 'updateSalary' }),
      );
    });

    it('sets base salary to 0 when updating status to unemployed', async () => {
      const result = await writeTool.updateSalary(userId, { isUnemployed: true });

      expect(result.success).toBe(true);
      if ('success' in result) {
        expect(result.message).toContain('unemployed');
        expect(result.message).toContain('₱0.00');
      }
      expect(mockUsersService.updateUser).toHaveBeenCalledWith(userId, {
        baseSalary: 0,
        isUnemployed: true,
      });
    });

    it('updates employment to employed with new base salary', async () => {
      const result = await writeTool.updateSalary(userId, {
        baseSalary: 75000,
        isUnemployed: false,
      });

      expect(result.success).toBe(true);
      if ('success' in result) {
        expect(result.message).toContain('₱75,000.00');
      }
      expect(mockUsersService.updateUser).toHaveBeenCalledWith(userId, {
        baseSalary: 75000,
        isUnemployed: false,
      });
    });
  });
});
