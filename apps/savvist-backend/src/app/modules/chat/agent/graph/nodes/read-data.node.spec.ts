import { readDataNodeFactory } from './read-data.node';
import { Types } from 'mongoose';
import { AgentStateType } from '../agent.state';

describe('readDataNode', () => {
  let mockReadTool: any;
  let mockObservability: any;
  const userId = '6adf58efb1a87dfd54b8d3a3';

  beforeEach(() => {
    mockReadTool = {
      getBalances: jest.fn().mockResolvedValue({ summary: {}, dailyStatus: {} }),
      getExpenses: jest.fn().mockResolvedValue({ found: true }),
      queryWishlist: jest.fn().mockResolvedValue({ found: true }),
      getRecordLogs: jest.fn().mockResolvedValue({ count: 0, logs: [] }),
      getProfile: jest.fn().mockResolvedValue({ displayName: 'Test User' }),
    };
    mockObservability = {
      SetExecutedNode: jest.fn(),
    };
  });

  it('records read-data node execution via observability', async () => {
    const node = readDataNodeFactory({ readTool: mockReadTool, observability: mockObservability });
    const state = {
      context: { userId, today: '2026-10-31' },
      intentResult: { intent: 'read_balances' },
      slots: {},
    } as any;

    await node(state);

    expect(mockObservability.SetExecutedNode).toHaveBeenCalledWith('read-data');
  });

  it('resolves date slot and passes to readTool.getBalances for read_balances intent', async () => {
    const node = readDataNodeFactory({ readTool: mockReadTool, observability: mockObservability });
    const state = {
      context: { userId, today: '2026-10-31' },
      intentResult: { intent: 'read_balances' },
      slots: { accountName: null, date: 'today' },
    } as any;

    const result = await node(state);

    expect(mockReadTool.getBalances).toHaveBeenCalledWith(
      new Types.ObjectId(userId),
      undefined,
      '2026-10-31',
    );
    expect(result.readResult).toBeDefined();
  });

  it('normalizes free-text date slot before passing to readTool.getBalances', async () => {
    const node = readDataNodeFactory({ readTool: mockReadTool, observability: mockObservability });
    const state = {
      context: { userId, today: '2026-10-31' },
      intentResult: { intent: 'read_balances' },
      slots: { accountName: 'BDO', date: 'yesterday' },
    } as any;

    await node(state);

    expect(mockReadTool.getBalances).toHaveBeenCalledWith(
      new Types.ObjectId(userId),
      'BDO',
      '2026-10-30',
    );
  });

  it('executes multiple read intents in parallel when secondary read intents are present', async () => {
    const node = readDataNodeFactory({ readTool: mockReadTool, observability: mockObservability });
    const state = {
      context: { userId, today: '2026-10-31' },
      intentResult: {
        intent: 'read_expenses',
        secondary: ['read_wishlist'],
      },
      slots: {},
    } as any;

    const result = await node(state);

    expect(mockReadTool.getExpenses).toHaveBeenCalled();
    expect(mockReadTool.queryWishlist).toHaveBeenCalled();
    expect((result.readResult as any).multiIntent).toBe(true);
    expect((result.readResult as any).results.read_expenses).toBeDefined();
    expect((result.readResult as any).results.read_wishlist).toBeDefined();
  });

  it('throws an error if userId is missing from state context', async () => {
    const node = readDataNodeFactory({ readTool: mockReadTool, observability: mockObservability });
    const state = {
      context: { userId: null },
      intentResult: { intent: 'read_balances' },
    } as any;

    await expect(node(state)).rejects.toThrow('User ID missing in state context');
  });

  it('delegates to productSearchService for search_products intent', async () => {
    const mockProductSearch = {
      findProducts: jest.fn().mockResolvedValue({
        query: 'keyboard 2000 to 4000',
        items: [{ name: 'RK61', price: { value: 2400, currency: 'PHP' } }],
      }),
    };

    const node = readDataNodeFactory({
      readTool: mockReadTool,
      productSearchService: mockProductSearch as any,
      observability: mockObservability,
    });

    const state = {
      context: { userId, today: '2026-10-31' },
      intentResult: { intent: 'search_products' },
      slots: { searchQuery: 'keyboard 2000 to 4000', limit: 3 },
      messages: [],
    } as any;

    const result = await node(state);

    expect(mockProductSearch.findProducts).toHaveBeenCalledWith('keyboard 2000 to 4000', {
      count: 3,
    });
    expect((result.readResult as any).items).toHaveLength(1);
  });

  it('returns error if productSearchService is not available for search_products', async () => {
    const node = readDataNodeFactory({
      readTool: mockReadTool,
      observability: mockObservability,
    });

    const state = {
      context: { userId, today: '2026-10-31' },
      intentResult: { intent: 'search_products' },
      slots: { searchQuery: 'shoes' },
      messages: [],
    } as any;

    const result = await node(state);
    expect((result.readResult as any).error).toBe('ProductSearchService not available');
  });
});
