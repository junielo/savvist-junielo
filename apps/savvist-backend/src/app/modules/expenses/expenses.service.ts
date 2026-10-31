import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TransactionService } from '../../database/transaction.service';
import { RecordLogsService } from '../record-logs/record-logs.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Expense, ExpenseDocument } from './schemas/expense.schema';

function getCurrentMonthInTimeZone(timeZone = 'Asia/Manila'): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'numeric',
  });
  return parseInt(formatter.format(new Date()), 10);
}

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    private readonly transactionService: TransactionService,
    private readonly recordLogsService: RecordLogsService,
  ) {}

  private validateMonthsAndDay(dayOfMonth: number, months?: number[]) {
    if (months && months.length > 0) {
      const uniqueMonths = new Set(months);
      if (uniqueMonths.size !== months.length) {
        throw new BadRequestException('Months must be unique');
      }

      const maxDays: Record<number, number> = {
        1: 31,
        2: 29,
        3: 31,
        4: 30,
        5: 31,
        6: 30,
        7: 31,
        8: 31,
        9: 30,
        10: 31,
        11: 30,
        12: 31,
      };

      const validInAtLeastOne = months.some((m) => {
        const max = maxDays[m] || 31;
        return dayOfMonth <= max;
      });

      if (!validInAtLeastOne) {
        throw new BadRequestException(
          `Day of month ${dayOfMonth} does not exist in any of the selected months`,
        );
      }
    }
  }

  async findAll(userId: Types.ObjectId): Promise<Expense[]> {
    return this.expenseModel
      .find({ userId })
      .sort({ dayOfMonth: 1, createdAt: 1 })
      .lean();
  }

  async findOne(userId: Types.ObjectId, id: Types.ObjectId): Promise<Expense> {
    const expense = await this.expenseModel
      .findOne({ _id: id, userId })
      .lean();

    if (!expense) {
      throw new NotFoundException(`Expense with id "${id}" not found`);
    }

    return expense;
  }

  async create(userId: Types.ObjectId, dto: CreateExpenseDto): Promise<Expense> {
    const months = dto.months || [];
    this.validateMonthsAndDay(dto.dayOfMonth, months);

    return this.transactionService.run(async (session) => {
      const expense = new this.expenseModel({
        userId,
        name: dto.name,
        amount: dto.amount,
        dayOfMonth: dto.dayOfMonth,
        months,
      });
      await expense.save({ session });

      await this.recordLogsService.create(
        {
          userId,
          name: expense.name,
          amount: expense.amount,
          recordType: 'expense',
          action: 'created',
          sourceCollection: 'expenses',
          sourceId: expense._id,
        },
        session,
      );

      this.logger.log(`Created expense "${dto.name}" for user ${userId}`);
      return expense.toObject();
    });
  }

  async update(
    userId: Types.ObjectId,
    id: Types.ObjectId,
    dto: UpdateExpenseDto,
  ): Promise<Expense> {
    return this.transactionService.run(async (session) => {
      const expense = await this.expenseModel.findOne({ _id: id, userId }).session(session);
      if (!expense) {
        throw new NotFoundException(`Expense with id "${id}" not found`);
      }

      const targetDay = dto.dayOfMonth !== undefined ? dto.dayOfMonth : expense.dayOfMonth;
      const targetMonths = dto.months !== undefined ? dto.months : expense.months;
      this.validateMonthsAndDay(targetDay, targetMonths);

      const previousAmount = expense.amount;

      const newName = dto.name !== undefined ? dto.name : expense.name;
      const newAmount = dto.amount !== undefined ? dto.amount : expense.amount;
      const newDayOfMonth = dto.dayOfMonth !== undefined ? dto.dayOfMonth : expense.dayOfMonth;
      const newMonths = dto.months !== undefined ? dto.months : expense.months;

      const hasChanges =
        newName !== expense.name ||
        newAmount !== expense.amount ||
        newDayOfMonth !== expense.dayOfMonth ||
        JSON.stringify(newMonths) !== JSON.stringify(expense.months);

      if (!hasChanges) {
        return expense.toObject();
      }

      if (dto.name !== undefined) expense.name = dto.name;
      if (dto.amount !== undefined) expense.amount = dto.amount;
      if (dto.dayOfMonth !== undefined) expense.dayOfMonth = dto.dayOfMonth;
      if (dto.months !== undefined) expense.months = dto.months;

      const updated = await expense.save({ session });

      await this.recordLogsService.create(
        {
          userId,
          name: updated.name,
          amount: updated.amount,
          previousAmount,
          recordType: 'expense',
          action: 'updated',
          sourceCollection: 'expenses',
          sourceId: updated._id,
        },
        session,
      );

      this.logger.log(`Updated expense ${id} for user ${userId}`);
      return updated.toObject();
    });
  }

  async remove(
    userId: Types.ObjectId,
    id: Types.ObjectId,
  ): Promise<{ deleted: boolean; _id: string }> {
    return this.transactionService.run(async (session) => {
      const expense = await this.expenseModel.findOne({ _id: id, userId }).session(session);
      if (!expense) {
        throw new NotFoundException(`Expense with id "${id}" not found`);
      }

      const name = expense.name;
      const amount = expense.amount;
      const sourceId = expense._id;

      await this.expenseModel.deleteOne({ _id: id, userId }).session(session);

      await this.recordLogsService.create(
        {
          userId,
          name,
          amount,
          recordType: 'expense',
          action: 'deleted',
          sourceCollection: 'expenses',
          sourceId,
        },
        session,
      );

      this.logger.log(`Deleted expense ${id} for user ${userId}`);
      return { deleted: true, _id: id.toString() };
    });
  }

  async getTotal(userId: Types.ObjectId, monthQuery?: number): Promise<{ total: number }> {
    const month =
      monthQuery !== undefined && !isNaN(monthQuery)
        ? monthQuery
        : getCurrentMonthInTimeZone();

    const result = await this.expenseModel.aggregate([
      {
        $match: {
          userId,
          $or: [
            { months: { $size: 0 } },
            { months: month },
          ],
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const total = result.length > 0 ? result[0].total : 0;
    return { total };
  }
}
