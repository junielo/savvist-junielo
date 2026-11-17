/* eslint-disable @typescript-eslint/no-explicit-any */
import { WriteTool } from './write.tool';
import { Types } from 'mongoose';

describe('WriteTool', () => {
  let writeTool: WriteTool;
  let mockAccountEntriesService: any;
  let mockEntryRecordsService: any;
  let mockUsersService: any;
  let mockExpensesService: any;
  let mockJevClient: any;
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
    mockExpensesService = {
      createMany: jest.fn().mockImplementation((_uid, dtos) =>
        Promise.resolve(
          dtos.map((d: any) => ({
            _id: new Types.ObjectId(),
            userId,
            ...d,
          })),
        ),
      ),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    mockJevClient = {
      resolveEntityMatch: jest.fn(),
    };
    mockObservability = {
      setToolCall: jest.fn(),
    };

    writeTool = new WriteTool(
      mockAccountEntriesService,
      mockEntryRecordsService,
      mockUsersService,
      mockExpensesService,
      mockJevClient,
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

  describe('createExpense', () => {
    it('successfully creates a single expense with recurrence and formatted message', async () => {
      const result = await writeTool.createExpense(userId, {
        expenses: [{ name: 'Rent', amount: 15000, dayOfMonth: 5, months: [] }],
      });

      expect(result.success).toBe(true);
      if ('success' in result) {
        expect(result.action).toBe('created');
        expect(result.message).toContain('Successfully added expense "Rent" for ₱15,000.00 (due every 5th)');
      }
      expect(mockExpensesService.createMany).toHaveBeenCalledWith(userId, [
        { name: 'Rent', amount: 15000, dayOfMonth: 5, months: [] },
      ]);
      expect(mockObservability.setToolCall).toHaveBeenCalledWith(
        'write-tool',
        expect.objectContaining({ method: 'createExpense' }),
      );
    });

    it('successfully creates multiple expenses in a batch', async () => {
      const result = await writeTool.createExpense(userId, {
        expenses: [
          { name: 'Rent', amount: 15000, dayOfMonth: 5, months: [] },
          { name: 'PLDT Wifi', amount: 1899, dayOfMonth: 20, months: [] },
        ],
      });

      expect(result.success).toBe(true);
      if ('success' in result) {
        expect(result.message).toContain('Successfully added 2 expenses:');
        expect(result.message).toContain('- Rent: ₱15,000.00 (due every 5th)');
        expect(result.message).toContain('- PLDT Wifi: ₱1,899.00 (due every 20th)');
      }
      expect(mockExpensesService.createMany).toHaveBeenCalledWith(userId, expect.any(Array));
    });

    it('formats specific recurring months when provided', async () => {
      const result = await writeTool.createExpense(userId, {
        expenses: [{ name: 'Car Insurance', amount: 4500, dayOfMonth: 10, months: [3, 9] }],
      });

      expect(result.success).toBe(true);
      if ('success' in result) {
        expect(result.message).toContain('due every 10th in Mar, Sep');
      }
    });

    it('returns error when items array is empty and no fallback params provided', async () => {
      const result = await writeTool.createExpense(userId, {
        expenses: [],
      });

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('No expense items specified');
      }
      expect(mockExpensesService.createMany).not.toHaveBeenCalled();
    });

    it('returns error when dayOfMonth is out of range 1-31', async () => {
      const result = await writeTool.createExpense(userId, {
        expenses: [{ name: 'Invalid Day', amount: 1000, dayOfMonth: 32 }],
      });

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('must be between 1 and 31');
      }
      expect(mockExpensesService.createMany).not.toHaveBeenCalled();
    });

    it('returns error when name is empty', async () => {
      const result = await writeTool.createExpense(userId, {
        expenses: [{ name: '  ', amount: 1000, dayOfMonth: 15 }],
      });

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('cannot be empty');
      }
      expect(mockExpensesService.createMany).not.toHaveBeenCalled();
    });
  });

  describe('resolveExpense', () => {
    const waterExpense = {
      _id: new Types.ObjectId(),
      name: 'water',
      amount: 500,
      dayOfMonth: 10,
    };
    const meralcoExpense = {
      _id: new Types.ObjectId(),
      name: 'Meralco',
      amount: 4000,
      dayOfMonth: 5,
    };

    it('resolves exact match immediately without Jev', async () => {
      mockExpensesService.findAll.mockResolvedValueOnce([waterExpense, meralcoExpense]);
      const res = await writeTool.resolveExpense(userId, 'water');
      expect(res).toEqual(waterExpense);
      expect(mockJevClient.resolveEntityMatch).not.toHaveBeenCalled();
    });

    it('uses Jev to resolve "water bill" to "water"', async () => {
      mockExpensesService.findAll.mockResolvedValueOnce([waterExpense, meralcoExpense]);
      mockJevClient.resolveEntityMatch.mockResolvedValueOnce({
        matched: { id: String(waterExpense._id), name: 'water' },
        confidence: 0.95,
      });

      const res = await writeTool.resolveExpense(userId, 'water bill');
      expect(res).toEqual(waterExpense);
      expect(mockJevClient.resolveEntityMatch).toHaveBeenCalledWith(
        'water bill',
        expect.arrayContaining([{ id: String(waterExpense._id), name: 'water' }]),
      );
    });

    it('falls back to substring matching if Jev fails or throws', async () => {
      mockExpensesService.findAll.mockResolvedValueOnce([waterExpense, meralcoExpense]);
      mockJevClient.resolveEntityMatch.mockRejectedValueOnce(new Error('Network error'));

      const res = await writeTool.resolveExpense(userId, 'water bill');
      expect(res).toEqual(waterExpense);
    });

    it('returns null if no expense matches', async () => {
      mockExpensesService.findAll.mockResolvedValueOnce([waterExpense, meralcoExpense]);
      mockJevClient.resolveEntityMatch.mockResolvedValueOnce({
        matched: null,
        confidence: 0.1,
      });

      const res = await writeTool.resolveExpense(userId, 'Gym membership');
      expect(res).toBeNull();
    });
  });

  describe('updateExpense', () => {
    const waterExpense = {
      _id: new Types.ObjectId(),
      name: 'water',
      amount: 500,
      dayOfMonth: 10,
      months: [],
    };

    it('successfully updates an expense name when resolved by targetName', async () => {
      mockExpensesService.findAll.mockResolvedValueOnce([waterExpense]);
      mockJevClient.resolveEntityMatch.mockResolvedValueOnce({
        matched: { id: String(waterExpense._id), name: 'water' },
        confidence: 0.95,
      });
      mockExpensesService.update.mockResolvedValueOnce({
        ...waterExpense,
        name: 'Maynilad',
      });

      const res = await writeTool.updateExpense(userId, {
        targetName: 'water bill',
        newName: 'Maynilad',
      });

      expect(res.success).toBe(true);
      if ('success' in res) {
        expect(res.action).toBe('updated');
        expect(res.message).toContain('Successfully updated expense "Maynilad" (renamed to "Maynilad"');
        expect(res.message).toContain('current amount: ₱500.00');
      }
      expect(mockExpensesService.update).toHaveBeenCalledWith(
        userId,
        waterExpense._id,
        { name: 'Maynilad' },
      );
    });

    it('returns error if target expense cannot be found', async () => {
      mockExpensesService.findAll.mockResolvedValueOnce([waterExpense]);
      mockJevClient.resolveEntityMatch.mockResolvedValueOnce({
        matched: null,
        confidence: 0.1,
      });

      const res = await writeTool.updateExpense(userId, {
        targetName: 'Nonexistent',
        newName: 'Maynilad',
      });

      expect('error' in res).toBe(true);
      if ('error' in res) {
        expect(res.error).toContain('Expense "Nonexistent" not found');
      }
      expect(mockExpensesService.update).not.toHaveBeenCalled();
    });

    it('returns error if amount is negative or 0', async () => {
      mockExpensesService.findAll.mockResolvedValueOnce([waterExpense]);
      const res = await writeTool.updateExpense(userId, {
        targetName: 'water',
        amount: -100,
      });

      expect('error' in res).toBe(true);
      if ('error' in res) {
        expect(res.error).toContain('greater than 0');
      }
      expect(mockExpensesService.update).not.toHaveBeenCalled();
    });

    it('returns error if dayOfMonth is out of range', async () => {
      mockExpensesService.findAll.mockResolvedValueOnce([waterExpense]);
      const res = await writeTool.updateExpense(userId, {
        targetName: 'water',
        dayOfMonth: 35,
      });

      expect('error' in res).toBe(true);
      if ('error' in res) {
        expect(res.error).toContain('between 1 and 31');
      }
      expect(mockExpensesService.update).not.toHaveBeenCalled();
    });
  });
});
