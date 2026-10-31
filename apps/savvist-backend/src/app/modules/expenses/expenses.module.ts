import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CurrentUserGuard } from '../../common/current-user/current-user.guard';
import { UsersModule } from '../users/users.module';
import { RecordLogsModule } from '../record-logs/record-logs.module';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { Expense, ExpenseSchema } from './schemas/expense.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Expense.name, schema: ExpenseSchema }]),
    UsersModule,
    RecordLogsModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService, CurrentUserGuard],
  exports: [ExpensesService, MongooseModule],
})
export class ExpensesModule {}
