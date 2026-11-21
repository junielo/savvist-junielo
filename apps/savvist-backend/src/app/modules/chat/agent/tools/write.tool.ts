/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger, Optional } from '@nestjs/common';
import { Types } from 'mongoose';
import { AccountEntriesService } from '../../../account-entries/account-entries.service';
import { EntryRecordsService } from '../../../entry-records/entry-records.service';
import { UsersService } from '../../../users/users.service';
import { ExpensesService } from '../../../expenses/expenses.service';
import { WishlistService } from '../../../wishlist/wishlist.service';
import { ObservabilityService } from '../observability/observability.service';
import { formatOrdinal } from './date-utils';
import { JevClient } from '../intent/classifiers/jev.client';
import type { Expense } from '../../../expenses/schemas/expense.schema';
import type { WishlistItem } from '../../../wishlist/schemas/wishlist.schema';

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

export interface UpdateSalaryParams {
  baseSalary?: number;
  isUnemployed?: boolean;
}

export interface CreateExpenseItem {
  name: string;
  amount: number;
  dayOfMonth: number;
  months?: number[];
}

export interface UpdateExpenseParams {
  id?: string;
  targetName: string;
  previousName?: string;
  previousAmount?: number;
  previousDayOfMonth?: number;
  previousMonths?: number[];
  newName?: string;
  amount?: number;
  dayOfMonth?: number;
  months?: number[];
}

export interface CreateExpenseParams {
  expenses?: CreateExpenseItem[];
  name?: string;
  amount?: number;
  dayOfMonth?: number;
  months?: number[];
}

export interface CreateWishlistItem {
  name: string;
  amount: number;
  priority?: string;
  description?: string;
}

export interface CreateWishlistParams {
  items?: CreateWishlistItem[];
  name?: string;
  amount?: number;
  priority?: string;
  description?: string;
}

export interface UpdateWishlistParams {
  id?: string;
  targetName: string;
  previousName?: string;
  previousAmount?: number;
  previousPriority?: string;
  newName?: string;
  amount?: number;
  priority?: string;
  status?: 'pending' | 'purchased';
  action?: 'update' | 'purchase' | 'delete';
}

export interface SwapWishlistPriorityParams {
  item1Name: string;
  item2Name: string;
}

export function normalizeWishlistPriority(val?: string | null): string {
  if (!val) return 'normal';
  const lower = val.trim().toLowerCase();
  if (['asap', 'urgent', 'critical'].includes(lower)) return 'asap';
  if (['priority', 'top priority', 'first priority'].includes(lower)) return 'priority';
  if (['important', 'high', 'high priority'].includes(lower)) return 'important';
  if (['peripheral', 'low', 'lowest', 'low priority'].includes(lower)) return 'peripheral';
  if (['normal', 'medium', 'default'].includes(lower)) return 'normal';
  const valid = ['asap', 'priority', 'important', 'normal', 'peripheral'];
  return valid.includes(lower) ? lower : 'normal';
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
    private readonly usersService: UsersService,
    private readonly expensesService: ExpensesService,
    @Optional() private readonly wishlistService?: WishlistService,
    @Optional() private readonly jevClient?: JevClient,
    @Optional() private readonly observability?: ObservabilityService,
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

  async updateSalary(userId: Types.ObjectId, params: UpdateSalaryParams): Promise<WriteResult> {
    const user = await this.usersService.findById(userId).catch(() => null);
    const isUnemployed = params.isUnemployed ?? user?.isUnemployed ?? false;
    const baseSalary = isUnemployed ? 0 : (params.baseSalary ?? user?.baseSalary ?? 0);

    try {
      const updated = await this.usersService.updateUser(userId, {
        baseSalary,
        isUnemployed,
      });

      let message: string;
      if (isUnemployed) {
        message = 'Successfully updated your status to unemployed (base salary set to ₱0.00).';
      } else {
        const formatted = `₱${baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        message = `Successfully updated your base salary to ${formatted}.`;
      }

      const result: WriteResult = {
        success: true,
        message,
        records: [updated],
        action: 'updated',
      };
      this.observability?.setToolCall('write-tool', { method: 'updateSalary', userId: String(userId), params, result });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to update base salary / employment status', msg);
      const errorResult: WriteResult = { error: msg };
      this.observability?.setToolCall('write-tool', { method: 'updateSalary', userId: String(userId), params, error: msg });
      return errorResult;
    }
  }

  async createExpense(userId: Types.ObjectId, params: CreateExpenseParams): Promise<WriteResult> {
    const rawItems: CreateExpenseItem[] =
      params.expenses && params.expenses.length > 0
        ? params.expenses
        : params.name && params.amount !== undefined && params.dayOfMonth !== undefined
          ? [{ name: params.name, amount: params.amount, dayOfMonth: params.dayOfMonth, months: params.months || [] }]
          : [];

    if (rawItems.length === 0) {
      const error = 'No expense items specified to add.';
      this.observability?.setToolCall('write-tool', { method: 'createExpense', userId: String(userId), params, error });
      return { error };
    }

    // Validate inputs
    for (const item of rawItems) {
      if (!item.name || item.name.trim().length === 0) {
        const error = 'Expense name cannot be empty.';
        this.observability?.setToolCall('write-tool', { method: 'createExpense', userId: String(userId), params, error });
        return { error };
      }
      if (item.amount === undefined || item.amount <= 0) {
        const error = `Expense amount for "${item.name}" must be greater than 0.`;
        this.observability?.setToolCall('write-tool', { method: 'createExpense', userId: String(userId), params, error });
        return { error };
      }
      if (!item.dayOfMonth || item.dayOfMonth < 1 || item.dayOfMonth > 31) {
        const error = `Recurring due day for "${item.name}" must be between 1 and 31.`;
        this.observability?.setToolCall('write-tool', { method: 'createExpense', userId: String(userId), params, error });
        return { error };
      }
    }

    try {
      const dtos = rawItems.map((item) => ({
        name: item.name.trim(),
        amount: item.amount,
        dayOfMonth: item.dayOfMonth,
        months: item.months || [],
      }));

      const created = await this.expensesService.createMany(userId, dtos);

      const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      let message: string;
      if (created.length === 1) {
        const exp = created[0];
        const formattedAmount = `₱${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const monthsStr =
          exp.months && exp.months.length > 0
            ? ` in ${exp.months.map((m: number) => monthNames[m]).join(', ')}`
            : '';
        message = `Successfully added expense "${exp.name}" for ${formattedAmount} (due every ${formatOrdinal(exp.dayOfMonth)}${monthsStr}).`;
      } else {
        const lines = created.map((exp) => {
          const formattedAmount = `₱${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          const monthsStr =
            exp.months && exp.months.length > 0
              ? ` in ${exp.months.map((m: number) => monthNames[m]).join(', ')}`
              : '';
          return `- ${exp.name}: ${formattedAmount} (due every ${formatOrdinal(exp.dayOfMonth)}${monthsStr})`;
        });
        message = `Successfully added ${created.length} expenses:\n${lines.join('\n')}`;
      }

      const result: WriteResult = {
        success: true,
        message,
        records: created,
        action: 'created',
      };
      this.observability?.setToolCall('write-tool', { method: 'createExpense', userId: String(userId), params, result });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to create expense(s)', msg);
      const errorResult: WriteResult = { error: msg };
      this.observability?.setToolCall('write-tool', { method: 'createExpense', userId: String(userId), params, error: msg });
      return errorResult;
    }
  }

  async resolveExpense(userId: Types.ObjectId, searchName: string): Promise<Expense | null> {
    if (!searchName || searchName.trim().length === 0) {
      return null;
    }
    const all = await this.expensesService.findAll(userId);
    if (!all || all.length === 0) {
      return null;
    }

    const trimmed = searchName.trim().toLowerCase();

    // 1. Exact match fast-path in code
    const exact = all.find((e) => e.name.trim().toLowerCase() === trimmed);
    if (exact) {
      return exact;
    }

    // 2. Jev semantic match
    if (this.jevClient) {
      try {
        const candidates = all.map((e) => ({ id: String((e as any)._id), name: e.name }));
        const matchRes = await this.jevClient.resolveEntityMatch(searchName, candidates);
        if (matchRes.matched) {
          const found = all.find(
            (e) => String((e as any)._id) === matchRes.matched?.id || e.name === matchRes.matched?.name,
          );
          if (found) {
            return found;
          }
        }
      } catch (err) {
        this.logger.warn(`Failed Jev entity match for expense "${searchName}": ${err}`);
      }
    }

    // 3. Fallback: substring matching
    const sub =
      all.find((e) => e.name.toLowerCase().includes(trimmed)) ??
      all.find((e) => trimmed.includes(e.name.toLowerCase()));

    return sub ?? null;
  }

  async updateExpense(userId: Types.ObjectId, params: UpdateExpenseParams): Promise<WriteResult> {
    if (!params.targetName && !params.id) {
      const error = 'No target expense specified to update.';
      this.observability?.setToolCall('write-tool', { method: 'updateExpense', userId: String(userId), params, error });
      return { error };
    }

    let targetExpense: Expense | null = null;
    if (params.id && Types.ObjectId.isValid(params.id)) {
      try {
        targetExpense = await this.expensesService.findOne(userId, new Types.ObjectId(params.id));
      } catch {
        // Fall back to resolving by targetName
      }
    }

    if (!targetExpense && params.targetName) {
      targetExpense = await this.resolveExpense(userId, params.targetName);
    }

    if (!targetExpense) {
      const error = `Expense "${params.targetName || params.id}" not found. Please specify an existing expense.`;
      this.observability?.setToolCall('write-tool', { method: 'updateExpense', userId: String(userId), params, error });
      return { error };
    }

    const expenseId = (targetExpense as any)._id as Types.ObjectId;

    // Validate update values if provided
    if (params.amount !== undefined && params.amount !== null && params.amount <= 0) {
      const error = 'Expense amount must be greater than 0.';
      this.observability?.setToolCall('write-tool', { method: 'updateExpense', userId: String(userId), params, error });
      return { error };
    }
    if (
      params.dayOfMonth !== undefined &&
      params.dayOfMonth !== null &&
      (params.dayOfMonth < 1 || params.dayOfMonth > 31)
    ) {
      const error = 'Recurring due day must be between 1 and 31.';
      this.observability?.setToolCall('write-tool', { method: 'updateExpense', userId: String(userId), params, error });
      return { error };
    }
    if (params.newName !== undefined && params.newName !== null && params.newName.trim().length === 0) {
      const error = 'New expense name cannot be empty.';
      this.observability?.setToolCall('write-tool', { method: 'updateExpense', userId: String(userId), params, error });
      return { error };
    }

    try {
      const updateDto: { name?: string; amount?: number; dayOfMonth?: number; months?: number[] } = {};
      if (params.newName && params.newName.trim().length > 0) updateDto.name = params.newName.trim();
      if (params.amount !== undefined && params.amount !== null) updateDto.amount = params.amount;
      if (params.dayOfMonth !== undefined && params.dayOfMonth !== null) updateDto.dayOfMonth = params.dayOfMonth;
      if (params.months !== undefined && params.months !== null) updateDto.months = params.months;

      const updated = await this.expensesService.update(userId, expenseId, updateDto);

      const prevName = params.previousName || targetExpense.name;
      const prevAmount = params.previousAmount ?? targetExpense.amount;
      const prevDay = params.previousDayOfMonth ?? targetExpense.dayOfMonth;

      // Construct a clean, natural user-facing message describing what changed
      const changes: string[] = [];
      if (params.newName && params.newName !== prevName) {
        changes.push(`renamed to "${updated.name}"`);
      }
      if (params.amount !== undefined && params.amount !== null && params.amount !== prevAmount) {
        const prevFormatted = `₱${prevAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const newFormatted = `₱${updated.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        changes.push(`amount updated from ${prevFormatted} to ${newFormatted}`);
      }
      if (params.dayOfMonth !== undefined && params.dayOfMonth !== null && params.dayOfMonth !== prevDay) {
        changes.push(
          `due day updated from every ${formatOrdinal(prevDay)} to every ${formatOrdinal(updated.dayOfMonth)}`,
        );
      }
      if (params.months !== undefined && params.months !== null && JSON.stringify(params.months) !== JSON.stringify(targetExpense.months)) {
        const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mStr =
          updated.months && updated.months.length > 0
            ? `due in ${updated.months.map((m: number) => monthNames[m]).join(', ')}`
            : 'due every month';
        changes.push(mStr);
      }

      const summary = changes.length > 0 ? changes.join(', ') : 'updated successfully';
      const formattedAmt = `₱${updated.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const message = `Successfully updated expense "${updated.name}" (${summary}, current amount: ${formattedAmt}, due every ${formatOrdinal(updated.dayOfMonth)}).`;

      const result: WriteResult = {
        success: true,
        message,
        records: [updated],
        action: 'updated',
      };
      this.observability?.setToolCall('write-tool', { method: 'updateExpense', userId: String(userId), params, result });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to update expense', msg);
      const errorResult: WriteResult = { error: msg };
      this.observability?.setToolCall('write-tool', { method: 'updateExpense', userId: String(userId), params, error: msg });
      return errorResult;
    }
  }

  async resolveWishlistItem(userId: Types.ObjectId, searchName: string): Promise<WishlistItem | null> {
    if (!searchName || searchName.trim().length === 0 || !this.wishlistService) {
      return null;
    }
    const all = await this.wishlistService.findAll(userId);
    if (!all || all.length === 0) {
      return null;
    }

    const trimmed = searchName.trim().toLowerCase();

    // 1. Exact match fast-path in code
    const exact = all.find((item) => item.name.trim().toLowerCase() === trimmed);
    if (exact) {
      return exact;
    }

    // 2. Jev semantic match
    if (this.jevClient) {
      try {
        const candidates = all.map((item) => ({ id: String((item as any)._id), name: item.name }));
        const matchRes = await this.jevClient.resolveEntityMatch(searchName, candidates);
        if (matchRes.matched) {
          const found = all.find(
            (item) => String((item as any)._id) === matchRes.matched?.id || item.name === matchRes.matched?.name,
          );
          if (found) {
            return found;
          }
        }
      } catch (err) {
        this.logger.warn(`Failed Jev entity match for wishlist item "${searchName}": ${err}`);
      }
    }

    // 3. Fallback: substring matching
    const sub =
      all.find((item) => item.name.toLowerCase().includes(trimmed)) ??
      all.find((item) => trimmed.includes(item.name.toLowerCase()));

    return sub ?? null;
  }

  async createWishlist(userId: Types.ObjectId, params: CreateWishlistParams): Promise<WriteResult> {
    if (!this.wishlistService) {
      const error = 'Wishlist service is not available.';
      this.observability?.setToolCall('write-tool', { method: 'createWishlist', userId: String(userId), params, error });
      return { error };
    }

    const rawItems: CreateWishlistItem[] =
      params.items && params.items.length > 0
        ? params.items
        : params.name && params.amount !== undefined
          ? [{ name: params.name, amount: params.amount, priority: params.priority, description: params.description }]
          : [];

    if (rawItems.length === 0) {
      const error = 'No wishlist items specified to add.';
      this.observability?.setToolCall('write-tool', { method: 'createWishlist', userId: String(userId), params, error });
      return { error };
    }

    // Validate inputs
    for (const item of rawItems) {
      if (!item.name || item.name.trim().length === 0) {
        const error = 'Wishlist item name cannot be empty.';
        this.observability?.setToolCall('write-tool', { method: 'createWishlist', userId: String(userId), params, error });
        return { error };
      }
      if (item.amount === undefined || item.amount <= 0) {
        const error = `Wishlist item amount for "${item.name}" must be greater than 0.`;
        this.observability?.setToolCall('write-tool', { method: 'createWishlist', userId: String(userId), params, error });
        return { error };
      }
    }

    try {
      const created: WishlistItem[] = [];
      for (const item of rawItems) {
        const priority = normalizeWishlistPriority(item.priority);
        const dto = {
          name: item.name.trim(),
          amount: item.amount,
          priority,
          description: item.description?.trim() || undefined,
        };
        const res = await this.wishlistService.create(userId, dto);
        created.push(res);
      }

      let message: string;
      if (created.length === 1) {
        const item = created[0];
        const formattedAmount = `₱${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        message = `Successfully added wishlist item "${item.name}" for ${formattedAmount} (${item.priority} priority).`;
      } else {
        const lines = created.map((item) => {
          const formattedAmount = `₱${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          return `- ${item.name}: ${formattedAmount} (${item.priority} priority)`;
        });
        message = `Successfully added ${created.length} items to your wishlist:\n${lines.join('\n')}`;
      }

      const result: WriteResult = {
        success: true,
        message,
        records: created,
        action: 'created',
      };
      this.observability?.setToolCall('write-tool', { method: 'createWishlist', userId: String(userId), params, result });
      return result;
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to create wishlist item(s)', msg);
      const errorResult: WriteResult = { error: msg };
      this.observability?.setToolCall('write-tool', { method: 'createWishlist', userId: String(userId), params, error: msg });
      return errorResult;
    }
  }

  async updateWishlist(userId: Types.ObjectId, params: UpdateWishlistParams): Promise<WriteResult> {
    if (!this.wishlistService) {
      const error = 'Wishlist service is not available.';
      this.observability?.setToolCall('write-tool', { method: 'updateWishlist', userId: String(userId), params, error });
      return { error };
    }

    if (!params.targetName && !params.id) {
      const error = 'No target wishlist item specified to update.';
      this.observability?.setToolCall('write-tool', { method: 'updateWishlist', userId: String(userId), params, error });
      return { error };
    }

    let targetItem: WishlistItem | null = null;
    if (params.id && Types.ObjectId.isValid(params.id)) {
      try {
        targetItem = await this.wishlistService.findOne(userId, new Types.ObjectId(params.id));
      } catch {
        // Fall back to resolving by targetName
      }
    }

    if (!targetItem && params.targetName) {
      targetItem = await this.resolveWishlistItem(userId, params.targetName);
    }

    if (!targetItem) {
      const error = `Wishlist item "${params.targetName || params.id}" not found. Please specify an existing wishlist item.`;
      this.observability?.setToolCall('write-tool', { method: 'updateWishlist', userId: String(userId), params, error });
      return { error };
    }

    const itemId = (targetItem as any)._id as Types.ObjectId;

    // Handle delete action
    if (params.action === 'delete') {
      try {
        await this.wishlistService.remove(userId, itemId);
        const formattedAmount = `₱${targetItem.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const message = `Successfully removed "${targetItem.name}" (${formattedAmount}) from your wishlist.`;
        const result: WriteResult = {
          success: true,
          message,
          records: [targetItem],
          action: 'updated',
        };
        this.observability?.setToolCall('write-tool', { method: 'updateWishlist', userId: String(userId), params, result });
        return result;
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error('Failed to remove wishlist item', msg);
        const errorResult: WriteResult = { error: msg };
        this.observability?.setToolCall('write-tool', { method: 'updateWishlist', userId: String(userId), params, error: msg });
        return errorResult;
      }
    }

    // Handle purchase action
    if (params.action === 'purchase' || params.status === 'purchased') {
      try {
        const purchased = await this.wishlistService.purchase(userId, itemId);
        const formattedAmount = `₱${purchased.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const message = `Successfully marked wishlist item "${purchased.name}" (${formattedAmount}) as purchased.`;
        const result: WriteResult = {
          success: true,
          message,
          records: [purchased],
          action: 'updated',
        };
        this.observability?.setToolCall('write-tool', { method: 'updateWishlist', userId: String(userId), params, result });
        return result;
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error('Failed to purchase wishlist item', msg);
        const errorResult: WriteResult = { error: msg };
        this.observability?.setToolCall('write-tool', { method: 'updateWishlist', userId: String(userId), params, error: msg });
        return errorResult;
      }
    }

    // Validate update values
    if (params.amount !== undefined && params.amount !== null && params.amount <= 0) {
      const error = 'Wishlist item amount must be greater than 0.';
      this.observability?.setToolCall('write-tool', { method: 'updateWishlist', userId: String(userId), params, error });
      return { error };
    }
    if (params.newName !== undefined && params.newName !== null && params.newName.trim().length === 0) {
      const error = 'New wishlist item name cannot be empty.';
      this.observability?.setToolCall('write-tool', { method: 'updateWishlist', userId: String(userId), params, error });
      return { error };
    }

    try {
      const updateDto: { name?: string; amount?: number; priority?: string; status?: string } = {};
      if (params.newName && params.newName.trim().length > 0) updateDto.name = params.newName.trim();
      if (params.amount !== undefined && params.amount !== null) updateDto.amount = params.amount;
      if (params.priority !== undefined && params.priority !== null) {
        updateDto.priority = normalizeWishlistPriority(params.priority);
      }
      if (params.status && ['pending', 'purchased'].includes(params.status)) {
        updateDto.status = params.status;
      }

      const updated = await this.wishlistService.update(userId, itemId, updateDto);

      const prevName = params.previousName || targetItem.name;
      const prevAmount = params.previousAmount ?? targetItem.amount;
      const prevPriority = params.previousPriority ?? targetItem.priority;

      const changes: string[] = [];
      if (params.newName && params.newName !== prevName) {
        changes.push(`renamed to "${updated.name}"`);
      }
      if (params.amount !== undefined && params.amount !== null && params.amount !== prevAmount) {
        const prevFormatted = `₱${prevAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const newFormatted = `₱${updated.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        changes.push(`amount updated from ${prevFormatted} to ${newFormatted}`);
      }
      if (updateDto.priority && updateDto.priority !== prevPriority) {
        changes.push(`priority updated from "${prevPriority}" to "${updated.priority}"`);
      }

      const summary = changes.length > 0 ? changes.join(', ') : 'updated successfully';
      const formattedAmt = `₱${updated.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const message = `Successfully updated wishlist item "${updated.name}" (${summary}, current amount: ${formattedAmt}, priority: ${updated.priority}).`;

      const result: WriteResult = {
        success: true,
        message,
        records: [updated],
        action: 'updated',
      };
      this.observability?.setToolCall('write-tool', { method: 'updateWishlist', userId: String(userId), params, result });
      return result;
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to update wishlist item', msg);
      const errorResult: WriteResult = { error: msg };
      this.observability?.setToolCall('write-tool', { method: 'updateWishlist', userId: String(userId), params, error: msg });
      return errorResult;
    }
  }

  async swapWishlistPriority(userId: Types.ObjectId, params: SwapWishlistPriorityParams): Promise<WriteResult> {
    if (!this.wishlistService) {
      const error = 'Wishlist service is not available.';
      this.observability?.setToolCall('write-tool', { method: 'swapWishlistPriority', userId: String(userId), params, error });
      return { error };
    }

    const item1 = await this.resolveWishlistItem(userId, params.item1Name);
    if (!item1) {
      const error = `Wishlist item "${params.item1Name}" not found.`;
      this.observability?.setToolCall('write-tool', { method: 'swapWishlistPriority', userId: String(userId), params, error });
      return { error };
    }

    const item2 = await this.resolveWishlistItem(userId, params.item2Name);
    if (!item2) {
      const error = `Wishlist item "${params.item2Name}" not found.`;
      this.observability?.setToolCall('write-tool', { method: 'swapWishlistPriority', userId: String(userId), params, error });
      return { error };
    }

    const item1Id = (item1 as any)._id as Types.ObjectId;
    const item2Id = (item2 as any)._id as Types.ObjectId;

    if (item1Id.toString() === item2Id.toString()) {
      const error = 'Cannot swap priority with the same item.';
      this.observability?.setToolCall('write-tool', { method: 'swapWishlistPriority', userId: String(userId), params, error });
      return { error };
    }

    const priority1 = item1.priority;
    const priority2 = item2.priority;

    if (priority1 === priority2) {
      const message = `Both "${item1.name}" and "${item2.name}" already have "${priority1}" priority. No swap needed.`;
      return { success: true, message, records: [item1, item2], action: 'updated' };
    }

    try {
      if (priority1 === 'priority') {
        await this.wishlistService.updateType(userId, item1Id, 'normal');
        await this.wishlistService.updateType(userId, item2Id, 'priority');
        await this.wishlistService.updateType(userId, item1Id, priority2);
      } else if (priority2 === 'priority') {
        await this.wishlistService.updateType(userId, item2Id, 'normal');
        await this.wishlistService.updateType(userId, item1Id, 'priority');
        await this.wishlistService.updateType(userId, item2Id, priority1);
      } else {
        await this.wishlistService.updateType(userId, item1Id, priority2);
        await this.wishlistService.updateType(userId, item2Id, priority1);
      }

      const updated1 = await this.wishlistService.findOne(userId, item1Id);
      const updated2 = await this.wishlistService.findOne(userId, item2Id);

      const message = `Successfully swapped priorities: "${updated1.name}" is now ${updated1.priority}, and "${updated2.name}" is now ${updated2.priority}.`;
      const result: WriteResult = {
        success: true,
        message,
        records: [updated1, updated2],
        action: 'updated',
      };
      this.observability?.setToolCall('write-tool', { method: 'swapWishlistPriority', userId: String(userId), params, result });
      return result;
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to swap wishlist priorities', msg);
      const errorResult: WriteResult = { error: msg };
      this.observability?.setToolCall('write-tool', { method: 'swapWishlistPriority', userId: String(userId), params, error: msg });
      return errorResult;
    }
  }
}
