import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';
import { TransactionService } from '../../database/transaction.service';
import { RecordLogsService } from '../record-logs/record-logs.service';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly transactionService: TransactionService,
    private readonly recordLogsService: RecordLogsService,
  ) {}

  // Single-user app for now: create "John Doe" on first start (DATABASE.md section 11).
  async onModuleInit() {
    if ((await this.userModel.estimatedDocumentCount()) > 0) return;
    await this.userModel.create({
      displayName: 'John Doe',
    });
    this.logger.log('Seeded default user');
  }

  // TODO: replace with the current-user guard (lookup by id) later.
  async findCurrent(): Promise<UserDocument> {
    const user = await this.userModel.findOne().sort({ createdAt: 1 });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateCurrent(dto: UpdateUserDto): Promise<UserDocument> {
    return this.transactionService.run(async (session) => {
      const user = await this.userModel.findOne().sort({ createdAt: 1 }).session(session);
      if (!user) throw new NotFoundException('User not found');

      const oldBaseSalary = user.baseSalary;

      if (dto.displayName !== undefined) user.displayName = dto.displayName;
      if (dto.salaryDay1 !== undefined) user.salaryDay1 = dto.salaryDay1;
      if (dto.salaryDay2 !== undefined) user.salaryDay2 = dto.salaryDay2;

      // Rule: unemployed forces baseSalary = 0
      const isUnemployed = dto.isUnemployed ?? user.isUnemployed;
      user.isUnemployed = isUnemployed;
      const newBaseSalary = isUnemployed ? 0 : (dto.baseSalary ?? user.baseSalary);
      user.baseSalary = newBaseSalary;

      await user.save({ session });

      if (newBaseSalary !== oldBaseSalary) {
        const existingLog = await this.recordLogsService.findOne(
          {
            userId: user._id,
            sourceCollection: 'users',
            name: 'Base salary updated',
          },
          session,
        );

        const action = existingLog ? 'updated' : 'created';

        await this.recordLogsService.create(
          {
            userId: user._id,
            name: 'Base salary updated',
            amount: newBaseSalary,
            recordType: 'cash',
            action,
            date: new Date(),
            sourceCollection: 'users',
            sourceId: user._id,
            previousAmount: oldBaseSalary,
          },
          session,
        );

        this.logger.log(`Logged base salary update (${action}) for user ${user._id}: ${oldBaseSalary} -> ${newBaseSalary}`);
      }

      return user;
    });
  }
}