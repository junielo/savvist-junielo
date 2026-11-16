/* eslint-disable @typescript-eslint/no-explicit-any */
import { executeWriteNodeFactory } from './execute-write.node';
import { Types } from 'mongoose';
import { AgentStateType } from '../agent.state';

describe('executeWriteNode', () => {
  let mockWriteTool: any;
  let mockObservability: any;
  const userId = '6adf58efb1a87dfd54b8d3a3';

  beforeEach(() => {
    mockWriteTool = {
      updateBalance: jest.fn().mockResolvedValue({
        success: true,
        message: 'Successfully updated balance for BDO Debit.',
        record: {},
      }),
    };
    mockObservability = {
      SetExecutedNode: jest.fn(),
    };
  });

  it('calls writeTool.updateBalance and returns success writeResult', async () => {
    const node = executeWriteNodeFactory({ writeTool: mockWriteTool, observability: mockObservability });
    const state = {
      context: { userId },
      pending_action: {
        tool: 'update_balance',
        args: { accountName: 'BDO Debit', amount: 35000, date: '2026-10-31' },
        confirmedReplace: false,
      },
    } as any;

    const result = await node(state);

    expect(mockObservability.SetExecutedNode).toHaveBeenCalledWith('execute-write');
    expect(mockWriteTool.updateBalance).toHaveBeenCalledWith(
      new Types.ObjectId(userId),
      {
        accountName: 'BDO Debit',
        amount: 35000,
        date: '2026-10-31',
        confirmedReplace: false,
      },
    );
    expect(result.writeResult?.success).toBe(true);
    expect(result.writeResult?.message).toContain('Successfully updated balance');
    expect(result.pending_action).toBeNull();
  });

  it('updates pending_action with conflict details when conflict is returned', async () => {
    mockWriteTool.updateBalance.mockResolvedValue({
      conflict: true,
      existingBalance: 30000,
      proposedBalance: 35000,
      accountName: 'BDO Debit',
      day: '2026-10-31',
    });

    const node = executeWriteNodeFactory({ writeTool: mockWriteTool, observability: mockObservability });
    const state = {
      context: { userId },
      pending_action: {
        tool: 'update_balance',
        args: { accountName: 'BDO Debit', amount: 35000, date: '2026-10-31' },
        confirmedReplace: false,
      },
    } as any;

    const result = await node(state);

    expect(result.pending_action?.conflict).toEqual({
      existingBalance: 30000,
      proposedBalance: 35000,
      accountName: 'BDO Debit',
      day: '2026-10-31',
    });
    expect(result.writeResult).toBeUndefined();
  });
});
