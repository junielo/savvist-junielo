import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DailyMetric, DailyMetricDocument } from './schemas/daily-metric.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { AccountEntry, AccountEntryDocument } from '../account-entries/schemas/account-entry.schema';
import { EntryRecord, EntryRecordDocument } from '../entry-records/schemas/entry-record.schema';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { calculateActualCash } from './calculations/actual-cash';
import { calculateTotalFund } from './calculations/total-fund';
import { calculateHealth } from './calculations/health';
import { calculateGrowth } from './calculations/growth';

@Injectable()
export class DailyMetricsService {
  private readonly logger = new Logger(DailyMetricsService.name);

  constructor(
    @InjectModel(DailyMetric.name)
    private readonly dailyMetricModel: Model<DailyMetricDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(AccountEntry.name)
    private readonly accountEntryModel: Model<AccountEntryDocument>,
    @InjectModel(EntryRecord.name)
    private readonly entryRecordModel: Model<EntryRecordDocument>,
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
  ) {}

  async computeAndSaveForDay(
    userId: Types.ObjectId,
    day: string,
  ): Promise<DailyMetric> {
    const user = await this.userModel.findById(userId).lean();
    const baseSalary = user?.baseSalary || 0;

    const accounts = await this.accountEntryModel
      .find({ userId, archivedAt: { $exists: false } })
      .lean();

    let cashTotal = 0;
    let savingsTotal = 0;
    let creditTotal = 0;

    for (const acc of accounts) {
      const latestRecord = await this.entryRecordModel
        .findOne({
          userId,
          accountEntryId: acc._id,
          day: { $lte: day },
        })
        .sort({ day: -1 })
        .lean();

      const balance = latestRecord?.balance || 0;
      if (acc.type === 'cash') {
        cashTotal += balance;
      } else if (acc.type === 'savings') {
        savingsTotal += balance;
      } else if (acc.type === 'credit') {
        creditTotal += balance;
      }
    }

    const expenses = await this.expenseModel.find({ userId }).lean();
    let expensesMonthlyEquivalent = 0;
    for (const exp of expenses) {
      const months = exp.months || [];
      if (months.length === 0 || months.length === 12) {
        expensesMonthlyEquivalent += exp.amount;
      } else {
        expensesMonthlyEquivalent += (exp.amount * months.length) / 12;
      }
    }
    expensesMonthlyEquivalent = Math.round(expensesMonthlyEquivalent * 100) / 100;

    const actualCash = calculateActualCash(cashTotal, creditTotal, expensesMonthlyEquivalent);
    const totalFund = calculateTotalFund(cashTotal, savingsTotal, creditTotal, expensesMonthlyEquivalent);
    const health = calculateHealth(baseSalary, totalFund, expensesMonthlyEquivalent, creditTotal);

    const targetDate = new Date(`${day}T00:00:00.000Z`);
    const dateMinus90 = new Date(targetDate.getTime() - 90 * 24 * 60 * 60 * 1000);
    const y90 = dateMinus90.getUTCFullYear();
    const m90 = String(dateMinus90.getUTCMonth() + 1).padStart(2, '0');
    const firstDayOfMonth90 = `${y90}-${m90}-01`;

    let prevMetric = await this.dailyMetricModel
      .findOne({ userId, day: { $lte: firstDayOfMonth90 } })
      .sort({ day: -1 })
      .lean();

    if (!prevMetric) {
      prevMetric = await this.dailyMetricModel
        .findOne({ userId })
        .sort({ day: 1 })
        .lean();
    }

    const prevTtlFund = prevMetric?.totalFund || totalFund;
    const growth = calculateGrowth(totalFund, prevTtlFund);

    const updated = await this.dailyMetricModel.findOneAndUpdate(
      { userId, day },
      {
        userId,
        day,
        totalFund,
        actualCash,
        health,
        growth,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    this.logger.log(`Computed and saved daily metrics for user ${userId} on ${day}`);
    return updated as DailyMetric;
  }

  async getTrend(userId: Types.ObjectId, limit = 30): Promise<DailyMetric[]> {
    return this.dailyMetricModel
      .find({ userId })
      .sort({ day: -1 })
      .limit(limit)
      .lean();
  }

  async getLatest(userId: Types.ObjectId): Promise<DailyMetric | null> {
    return this.dailyMetricModel
      .findOne({ userId })
      .sort({ day: -1 })
      .lean();
  }
}
