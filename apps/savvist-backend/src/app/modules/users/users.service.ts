import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

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
    const user = await this.findCurrent();

    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.salaryDay1 !== undefined) user.salaryDay1 = dto.salaryDay1;
    if (dto.salaryDay2 !== undefined) user.salaryDay2 = dto.salaryDay2;

    // Rule: unemployed forces baseSalary = 0
    const isUnemployed = dto.isUnemployed ?? user.isUnemployed;
    user.isUnemployed = isUnemployed;
    user.baseSalary = isUnemployed ? 0 : (dto.baseSalary ?? user.baseSalary);

    // Later: do this inside TransactionService.run together with a recordLogs insert.
    return user.save();
  }
}