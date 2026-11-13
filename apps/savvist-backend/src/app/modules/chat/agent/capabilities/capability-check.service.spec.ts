import { CapabilityCheckService } from './capability-check.service';

describe('CapabilityCheckService & Rules', () => {
  let service: CapabilityCheckService;
  let mockConfigService: any;
  let mockJevClient: any;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string, defaultValue: any) => {
        if (key === 'ALLOW_SALARY_CHANGE') return true;
        if (key === 'ALLOW_DELETES') return true;
        if (key === 'LARGE_AMOUNT_MULTIPLE') return 6;
        return defaultValue;
      }),
    };

    mockJevClient = {
      checkSemanticPolicy: jest.fn().mockResolvedValue({ isProhibited: false, probability: 0.1 }),
    };

    service = new CapabilityCheckService(mockConfigService, mockJevClient);
  });

  describe('futureDataRule', () => {
    it('blocks balance record dated in the future', async () => {
      const result = await service.check({
        intent: 'manage_entry_record',
        group: 'write',
        message: 'record balance for tomorrow',
        today: '2026-11-09',
        timeZone: 'Asia/Manila',
        slots: { date: '2026-11-10' },
      });

      expect(result.invalid).toBe(true);
      expect(result.reason).toContain('future');
    });

    it('allows balance record dated today or in the past', async () => {
      const result = await service.check({
        intent: 'manage_entry_record',
        group: 'write',
        message: 'record balance for today',
        today: '2026-11-09',
        timeZone: 'Asia/Manila',
        slots: { date: '2026-11-09' },
      });

      expect(result.invalid).toBe(false);
      expect(result.blocked).toBe(false);
    });
  });

  describe('reminderDateRule', () => {
    it('rejects reminder date in the past', async () => {
      const result = await service.check({
        intent: 'manage_reminder',
        group: 'write',
        message: 'remind me yesterday',
        today: '2026-11-09',
        timeZone: 'Asia/Manila',
        slots: { date: '2026-11-08' },
      });

      expect(result.invalid).toBe(true);
      expect(result.reason).toContain('past');
    });

    it('allows reminder date for today or future', async () => {
      const result = await service.check({
        intent: 'manage_reminder',
        group: 'write',
        message: 'remind me tomorrow',
        today: '2026-11-09',
        timeZone: 'Asia/Manila',
        slots: { date: '2026-11-10' },
      });

      expect(result.invalid).toBe(false);
      expect(result.blocked).toBe(false);
    });
  });

  describe('readOnlyDataRule', () => {
    it('blocks write attempts targeting record logs', async () => {
      const result = await service.check({
        intent: 'manage_entry_record',
        group: 'write',
        message: 'delete my record logs',
        today: '2026-11-09',
        timeZone: 'Asia/Manila',
        slots: { targetCollection: 'record_logs' },
      });

      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('read-only');
    });
  });

  describe('accountTypeLockRule', () => {
    it('invalidates changing account type when account has records', async () => {
      const result = await service.check({
        intent: 'manage_account_entry',
        group: 'write',
        message: 'change account type to savings',
        today: '2026-11-09',
        timeZone: 'Asia/Manila',
        slots: { action: 'change_type', hasRecords: true },
      });

      expect(result.invalid).toBe(true);
      expect(result.reason).toContain('Changing an account type');
    });
  });

  describe('largeAmountRule', () => {
    it('blocks affordability analysis for amounts exceeding 6x net income', async () => {
      const result = await service.check({
        intent: 'check_affordability',
        group: 'analysis',
        message: 'can I afford 500000?',
        today: '2026-11-09',
        timeZone: 'Asia/Manila',
        slots: { amount: 500000 },
        user: { netIncome: 50000 },
      });

      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('threshold');
    });

    it('allows affordability analysis within threshold', async () => {
      const result = await service.check({
        intent: 'check_affordability',
        group: 'analysis',
        message: 'can I afford 5000?',
        today: '2026-11-09',
        timeZone: 'Asia/Manila',
        slots: { amount: 5000 },
        user: { netIncome: 50000 },
      });

      expect(result.blocked).toBe(false);
    });
  });

  describe('policyFlagRule', () => {
    it('blocks salary update when ALLOW_SALARY_CHANGE is false', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ALLOW_SALARY_CHANGE') return false;
        return true;
      });

      const result = await service.check({
        intent: 'update_base_salary',
        group: 'write',
        message: 'change salary to 60000',
        today: '2026-11-09',
        timeZone: 'Asia/Manila',
      });

      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('disabled by configuration policy');
    });

    it('blocks delete when ALLOW_DELETES is false', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ALLOW_DELETES') return false;
        return true;
      });

      const result = await service.check({
        intent: 'manage_expense',
        group: 'write',
        message: 'delete my rent expense',
        today: '2026-11-09',
        timeZone: 'Asia/Manila',
        slots: { action: 'delete' },
      });

      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('disabled by configuration policy');
    });
  });

  describe('unsupportedFeatureRule', () => {
    it('blocks undo that requests', async () => {
      const result = await service.check({
        intent: 'out-of-scope',
        group: 'non-domain',
        message: 'undo that',
        today: '2026-11-09',
        timeZone: 'Asia/Manila',
      });

      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('"Undo that" is not supported');
    });

    it('blocks conversation management requests', async () => {
      const result = await service.check({
        intent: 'out-of-scope',
        group: 'non-domain',
        message: 'rename conversation to money',
        today: '2026-11-09',
        timeZone: 'Asia/Manila',
      });

      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('account settings');
    });

    it('blocks prohibited advice when Jev returns calibrated probability >= 0.7', async () => {
      mockJevClient.checkSemanticPolicy.mockResolvedValueOnce({
        isProhibited: true,
        probability: 0.88,
      });

      const result = await service.check({
        intent: 'read_expenses',
        group: 'read',
        message: 'should I buy bitcoin and crypto options?',
        today: '2026-11-09',
        timeZone: 'Asia/Manila',
      });

      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('does not provide investment, legal, or tax advice');
    });
  });
});
