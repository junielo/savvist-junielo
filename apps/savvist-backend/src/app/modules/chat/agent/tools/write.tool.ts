/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { AccountEntriesService } from '../../../account-entries/account-entries.service';
import { EntryRecordsService } from '../../../entry-records/entry-records.service';
import { ObservabilityService } from '../observability/observability.service';

export interface BalanceUpdateItem {
  accountName: string;
  amount: number;
}

export interface UpdateBalanceParams {
  accountName?: string;
  amount?: number;
  entries?: BalanceUpdateItem[];
  date?: string;
  confirmedReplace?: boolean;
}

export interface ConflictItem {
  existingBalance: number;
  proposedBalance: number;
  accountName: string;
  day: string;
}

export type WriteResult =
  | { success: true; message: string; records: unknown[]; action: 'created' | 'updated' | 'mixed' }
  | {
      conflict: true;
      conflicts: ConflictItem[];
      existingBalance: number;
      proposedBalance: number;
      accountName: string;
      day: string;
    }
  | { error: string };

@Injectable()
export class WriteTool {
  private readonly logger = new Logger(WriteTool.name);

  constructor(
    private readonly accountEntriesService: AccountEntriesService,
    private readonly entryRecordsService: EntryRecordsService,
    private readonly observability?: ObservabilityService,
  ) {}

  async updateBalance(userId: Types.ObjectId, params: UpdateBalanceParams): Promise<WriteResult> {
    const targetEntries: BalanceUpdateItem[] =
      params.entries && params.entries.length > 0
        ? params.entries
        : params.accountName && params.amount !== undefined
          ? [{ accountName: params.accountName, amount: params.amount }]
          : [];

    if (targetEntries.length === 0) {
      const error = 'No account balance entries specified to update.';
      this.observability?.setToolCall('write-tool', { method: 'updateBalance', userId: String(userId), params, error });
      return { error };
    }

    const accounts = await this.accountEntriesService.findAll(userId);
    const resolved: { entry: BalanceUpdateItem; account: any; accountIdStr: string }[] = [];

    for (const entry of targetEntries) {
      const query = entry.accountName.trim().toLowerCase();
      const account =
        accounts.find((a) => a.name.toLowerCase() === query) ??
        accounts.find((a) => a.name.toLowerCase().includes(query));

      if (!account) {
        const error = `Account "${entry.accountName}" not found. Please specify an existing account name.`;
        this.observability?.setToolCall('write-tool', { method: 'updateBalance', userId: String(userId), params, error });
        return { error };
      }

      const accountIdStr = (account as any)._id ? String((account as any)._id) : '';
      resolved.push({ entry, account, accountIdStr });
    }

    const day = params.date ?? new Date().toISOString().slice(0, 10);
    const existingRecords = await this.entryRecordsService.findByDate(userId, day);

    // Check for conflicts across all entries
    const conflicts: ConflictItem[] = [];
    for (const item of resolved) {
      const existing = existingRecords.find((r) => String(r.accountEntryId) === item.accountIdStr);
      if (existing && existing.balance !== item.entry.amount && !params.confirmedReplace) {
        conflicts.push({
          existingBalance: existing.balance,
          proposedBalance: item.entry.amount,
          accountName: item.account.name,
          day,
        });
      }
    }

    if (conflicts.length > 0) {
      const conflictResult: WriteResult = {
        conflict: true,
        conflicts,
        existingBalance: conflicts[0].existingBalance,
        proposedBalance: conflicts[0].proposedBalance,
        accountName: conflicts[0].accountName,
        day,
      };
      this.observability?.setToolCall('write-tool', {
        method: 'updateBalance',
        userId: String(userId),
        params,
        conflict: conflictResult,
      });
      return conflictResult;
    }

    try {
      const records: unknown[] = [];
      const actions: ('created' | 'updated')[] = [];
      const lines: string[] = [];

      for (const item of resolved) {
        const existing = existingRecords.find((r) => String(r.accountEntryId) === item.accountIdStr);
        const action = existing ? 'updated' : 'created';
        actions.push(action);

        const updated = await this.entryRecordsService.updateBalance(userId, {
          accountEntryId: item.accountIdStr,
          balance: item.entry.amount,
          day,
        });
        records.push(updated);

        const formattedAmount = `₱${item.entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        lines.push(`- ${item.account.name}: ${formattedAmount}`);
      }

      const allCreated = actions.every((a) => a === 'created');
      const allUpdated = actions.every((a) => a === 'updated');
      const actionSummary = allCreated ? 'created' : allUpdated ? 'updated' : 'mixed';

      let message: string;
      if (resolved.length === 1) {
        const formattedAmount = `₱${resolved[0].entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        message = `Successfully ${actions[0]} balance for ${resolved[0].account.name} on ${day} to ${formattedAmount}.`;
      } else {
        message = `Successfully recorded account balances for ${day}:\n${lines.join('\n')}`;
      }

      const result: WriteResult = {
        success: true,
        message,
        records,
        action: actionSummary,
      };
      this.observability?.setToolCall('write-tool', { method: 'updateBalance', userId: String(userId), params, result });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to update balance', msg);
      const errorResult: WriteResult = { error: msg };
      this.observability?.setToolCall('write-tool', { method: 'updateBalance', userId: String(userId), params, error: msg });
      return errorResult;
    }
  }
}
