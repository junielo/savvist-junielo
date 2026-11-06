import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { DashboardService } from '../../../dashboard/dashboard.service';
import { ExpensesService } from '../../../expenses/expenses.service';
import { WishlistService } from '../../../wishlist/wishlist.service';
import { RecordLogsService } from '../../../record-logs/record-logs.service';
import { UsersService } from '../../../users/users.service';
import { AccountEntriesService } from '../../../account-entries/account-entries.service';

const MAX_ITEMS = 10;
const TREND_DAYS = 30;

// Converts ObjectIds and Dates to plain strings so results are safe to checkpoint.
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const sum = (items: { amount: number }[]) => items.reduce((total, item) => total + item.amount, 0);

@Injectable()
export class ReadTool {
  private readonly logger = new Logger(ReadTool.name);

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly expensesService: ExpensesService,
    private readonly wishlistService: WishlistService,
    private readonly recordLogsService: RecordLogsService,
    private readonly usersService: UsersService,
    private readonly accountEntriesService: AccountEntriesService,
  ) {}

  async getBalances(userId: Types.ObjectId, accountName?: string) {
    const [summary, trend, accounts] = await Promise.all([
      this.dashboardService.getSummary(userId),
      this.dashboardService.getTrend(userId, TREND_DAYS),
      this.accountEntriesService.findAll(userId),
    ]);

    const query = accountName?.toLowerCase();
    const matchingAccount = query
      ? (accounts.find((acc) => acc.name.toLowerCase().includes(query)) ?? null)
      : null;

    return plain({
      summary,
      trend,
      matchingAccount,
      accountCount: accounts.length,
    });
  }

  async getExpenses(userId: Types.ObjectId, searchName?: string, options?: { month?: number }) {
    const all = await this.expensesService.findAll(userId);

    const month = options?.month;
    const forMonth = month
      ? all.filter((exp) => !exp.months?.length || exp.months.includes(month))
      : all;

    const query = searchName?.toLowerCase();
    const matched = query ? forMonth.filter((exp) => exp.name.toLowerCase().includes(query)) : forMonth;

    return plain({
      found: query ? matched.length > 0 : true,
      searchName: searchName ?? null,
      month: month ?? null,
      matchedCount: matched.length,
      matched: matched.slice(0, MAX_ITEMS).map((exp) => ({
        name: exp.name,
        amount: exp.amount,
        dayOfMonth: exp.dayOfMonth,
        months: exp.months,
      })),
      monthlyTotal: sum(forMonth),
    });
  }

  async getWishlist(userId: Types.ObjectId, searchName?: string) {
    const items = await this.wishlistService.findAll(userId);

    const query = searchName?.toLowerCase();
    const matched = query ? items.filter((item) => item.name.toLowerCase().includes(query)) : items;

    return plain({
      found: query ? matched.length > 0 : true,
      searchName: searchName ?? null,
      matchedCount: matched.length,
      matched: matched.slice(0, MAX_ITEMS).map((item) => ({
        name: item.name,
        amount: item.amount,
        purchasedAt: item.purchasedAt,
      })),
      pendingTotal: sum(items.filter((item) => !item.purchasedAt)),
    });
  }

  async getRecordLogs(userId: Types.ObjectId, query?: { search?: string; limit?: number }) {
    const logs = await this.recordLogsService.search(userId, query);

    return plain({
      count: logs.length,
      logs: logs.map((log) => ({
        name: log.name,
        action: log.action,
        amount: log.amount,
        date: log.date,
        source: log.sourceCollection,
      })),
    });
  }

  async getProfile(userId: Types.ObjectId) {
    const user = await this.usersService.findById(userId);

    return plain({
      displayName: user.displayName,
      baseSalary: user.baseSalary,
      salaryDay1: user.salaryDay1,
      salaryDay2: user.salaryDay2,
      isUnemployed: user.isUnemployed,
    });
  }
}