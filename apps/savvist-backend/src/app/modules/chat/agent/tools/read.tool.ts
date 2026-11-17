/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger, Optional } from '@nestjs/common';
import { Types } from 'mongoose';
import { DashboardService } from '../../../dashboard/dashboard.service';
import { ExpensesService } from '../../../expenses/expenses.service';
import { WishlistService } from '../../../wishlist/wishlist.service';
import { RecordLogsService } from '../../../record-logs/record-logs.service';
import { UsersService } from '../../../users/users.service';
import { AccountEntriesService } from '../../../account-entries/account-entries.service';
import { EntryRecordsService } from '../../../entry-records/entry-records.service';
import { ObservabilityService } from '../observability/observability.service';
import { WishlistQueryArgs, applyQuery, Row } from '../../../wishlist/wishlist-query';
import { todayIn, isValidTimeZone } from '../graph/turn-context';
import { computeExpenseDueDateInfo, computeNextDueDate } from './date-utils';
import { ToolDataSource, ExpenseRow, ExpenseDueQuery, filterAndSortExpensesByDueDate } from './data-tools';
import { JevClient } from '../intent/classifiers/jev.client';

const MAX_ITEMS = 10;
const TREND_DAYS = 30;

// Converts ObjectIds and Dates to plain strings so results are safe to checkpoint.
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const sum = (items: { amount: number }[]) => items.reduce((total, item) => total + item.amount, 0);

@Injectable()
export class ReadTool implements ToolDataSource {
  private readonly logger = new Logger(ReadTool.name);

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly expensesService: ExpensesService,
    private readonly wishlistService: WishlistService,
    private readonly recordLogsService: RecordLogsService,
    private readonly usersService: UsersService,
    private readonly accountEntriesService: AccountEntriesService,
    private readonly entryRecordsService: EntryRecordsService,
    private readonly jevClient?: JevClient,
    private readonly observability?: ObservabilityService,
  ) {}

  async getBalances(userId: Types.ObjectId, accountName?: string, date?: string) {
    const [summary, trend, accounts, user] = await Promise.all([
      this.dashboardService.getSummary(userId),
      this.dashboardService.getTrend(userId, TREND_DAYS),
      this.accountEntriesService.findAll(userId),
      this.usersService.findById(userId).catch(() => null),
    ]);

    const tz = user?.timeZone && isValidTimeZone(user.timeZone) ? user.timeZone : 'Asia/Manila';
    const targetDay = date ?? todayIn(tz, new Date());

    const records = await this.entryRecordsService.findByDate(userId, targetDay);
    const recordsByAccountId = new Map<string, (typeof records)[0]>();
    for (const rec of records) {
      recordsByAccountId.set(String(rec.accountEntryId), rec);
    }

    const enteredAccounts: { id: string; name: string; type: string; balance: number }[] = [];
    const missingAccounts: { id: string; name: string; type: string }[] = [];

    for (const acc of accounts) {
      const accId = (acc as any)._id ? String((acc as any)._id) : '';
      const rec = recordsByAccountId.get(accId);
      if (rec) {
        enteredAccounts.push({
          id: accId,
          name: acc.name,
          type: acc.type,
          balance: rec.balance,
        });
      } else {
        missingAccounts.push({
          id: accId,
          name: acc.name,
          type: acc.type,
        });
      }
    }

    const dailyStatus = {
      day: targetDay,
      totalAccounts: accounts.length,
      enteredCount: enteredAccounts.length,
      missingCount: missingAccounts.length,
      allEntered: accounts.length > 0 && missingAccounts.length === 0,
      noneEntered: accounts.length > 0 && enteredAccounts.length === 0,
      enteredAccounts,
      missingAccounts,
    };

    const query = accountName?.toLowerCase();
    const matchingAccount = query
      ? (accounts.find((acc) => acc.name.toLowerCase().includes(query)) ?? null)
      : null;

    const result = plain({
      summary,
      trend,
      matchingAccount,
      accountCount: accounts.length,
      dailyStatus,
    });
    this.observability?.setToolCall('read-tool', { method: 'getBalances', userId: String(userId), accountName, date: targetDay, result });
    return result;
  }

  async getExpenses(userId: Types.ObjectId, searchName?: string, options?: { month?: number }) {
    const [all, user] = await Promise.all([
      this.expensesService.findAll(userId),
      this.usersService.findById(userId).catch(() => null),
    ]);

    const tz = user?.timeZone && isValidTimeZone(user.timeZone) ? user.timeZone : 'Asia/Manila';
    const today = todayIn(tz, new Date());

    const month = options?.month;
    const forMonth = month
      ? all.filter((exp) => !exp.months?.length || exp.months.includes(month))
      : all;

    const query = searchName?.trim().toLowerCase();
    let matched = query
      ? forMonth.filter((exp) => exp.name.toLowerCase().includes(query) || query.includes(exp.name.toLowerCase()))
      : forMonth;

    if (query && matched.length === 0 && this.jevClient) {
      try {
        const candidates = forMonth.map((exp) => ({ id: String((exp as any)._id), name: exp.name }));
        const sem = await this.jevClient.resolveEntityMatch(searchName!, candidates);
        if (sem.matched) {
          matched = forMonth.filter(
            (exp) => String((exp as any)._id) === sem.matched?.id || exp.name === sem.matched?.name,
          );
        }
      } catch (err) {
        this.logger.warn(`Failed Jev entity match in ReadTool.getExpenses for "${searchName}": ${err}`);
      }
    }

    const result = plain({
      found: query ? matched.length > 0 : true,
      searchName: searchName ?? null,
      month: month ?? null,
      matchedCount: matched.length,
      matched: matched.slice(0, MAX_ITEMS).map((exp) => {
        const { nextDueDate, daysUntilDue } = computeExpenseDueDateInfo(
          { dayOfMonth: exp.dayOfMonth, months: exp.months },
          today,
        );
        return {
          id: (exp as any)._id ? String((exp as any)._id) : undefined,
          name: exp.name,
          amount: exp.amount,
          dayOfMonth: exp.dayOfMonth,
          months: exp.months,
          nextDueDate,
          daysUntilDue,
        };
      }),
      monthlyTotal: sum(forMonth),
    });
    this.observability?.setToolCall('read-tool', { method: 'getExpenses', userId: String(userId), searchName, month, result });
    return result;
  }

  async listExpensesByDueDate(query: ExpenseDueQuery): Promise<ExpenseRow[]> {
    const userObjectId = new Types.ObjectId(query.userId);
    const [all, user] = await Promise.all([
      this.expensesService.findAll(userObjectId),
      this.usersService.findById(userObjectId).catch(() => null),
    ]);

    const tz = user?.timeZone && isValidTimeZone(user.timeZone) ? user.timeZone : 'Asia/Manila';
    const today = todayIn(tz, new Date());

    const rows: ExpenseRow[] = all.map((exp: any) => ({
      id: String(exp._id),
      name: exp.name,
      amount: exp.amount,
      dueDate: computeNextDueDate(exp.dayOfMonth, exp.months, today),
    }));

    return filterAndSortExpensesByDueDate(rows, {
      order: query.order,
      limit: query.limit,
      from: query.from,
      to: query.to,
      today,
    });
  }

  async getExpenseById(userId: string, id: string): Promise<ExpenseRow | null> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const expenseObjectId = new Types.ObjectId(id);
      const [exp, user] = await Promise.all([
        this.expensesService.findOne(userObjectId, expenseObjectId),
        this.usersService.findById(userObjectId).catch(() => null),
      ]);
      if (!exp) return null;

      const tz = user?.timeZone && isValidTimeZone(user.timeZone) ? user.timeZone : 'Asia/Manila';
      const today = todayIn(tz, new Date());

      return {
        id: String((exp as any)._id ?? id),
        name: exp.name,
        amount: exp.amount,
        dueDate: computeNextDueDate(exp.dayOfMonth, exp.months, today),
      };
    } catch {
      return null;
    }
  }

  async queryWishlist(userId: Types.ObjectId, args: WishlistQueryArgs) {
    const [items, user] = await Promise.all([
      this.wishlistService.findAll(userId),
      this.usersService.findById(userId).catch(() => null),
    ]);

    const tz = user?.timeZone && isValidTimeZone(user.timeZone) ? user.timeZone : 'Asia/Manila';
    const today = todayIn(tz, new Date());

    const rows: Row[] = items.map((i: any) => ({
      id: String(i._id),
      name: i.name,
      amount: i.amount,
      priority: i.priority ?? 'normal',
      status: i.status ?? (i.purchasedAt ? 'purchased' : 'pending'),
      createdAt: i.createdAt ? new Date(i.createdAt).toISOString().split('T')[0] : null,
      purchasedAt: i.purchasedAt ? new Date(i.purchasedAt).toISOString().split('T')[0] : null,
    }));

    const { rows: matched, appliedFilters, aggregateResult } = applyQuery(rows, args, { today, tz });
    const limit = args.limit ?? MAX_ITEMS;

    const result = plain({
      found: matched.length > 0,
      appliedFilters,
      totalMatched: matched.length,
      returned: Math.min(matched.length, limit),
      truncated: matched.length > limit,
      count: matched.length,
      sum: sum(matched),
      pendingTotal: sum(rows.filter((r) => r.status === 'pending')),
      items: matched.slice(0, limit),
      aggregate: aggregateResult ?? null,
    });

    this.observability?.setToolCall('read-tool', { method: 'queryWishlist', userId: String(userId), args, result });
    return result;
  }

  async getRecordLogs(userId: Types.ObjectId, query?: { search?: string; limit?: number }) {
    const logs = await this.recordLogsService.search(userId, query);

    const result = plain({
      count: logs.length,
      logs: logs.map((log) => ({
        name: log.name,
        action: log.action,
        amount: log.amount,
        date: log.date,
        source: log.sourceCollection,
      })),
    });
    this.observability?.setToolCall('read-tool', { method: 'getRecordLogs', userId: String(userId), query, result });
    return result;
  }

  async getProfile(userId: Types.ObjectId) {
    const user = await this.usersService.findById(userId);

    const result = plain({
      displayName: user.displayName,
      baseSalary: user.baseSalary,
      salaryDay1: user.salaryDay1,
      salaryDay2: user.salaryDay2,
      isUnemployed: user.isUnemployed,
    });
    this.observability?.setToolCall('read-tool', { method: 'getProfile', userId: String(userId), result });
    return result;
  }
}