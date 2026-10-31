import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DailyMetricsService } from './daily-metrics.service';
import { DailyMetric, DailyMetricSchema } from './schemas/daily-metric.schema';
import { EntryRecord, EntryRecordSchema } from '../entry-records/schemas/entry-record.schema';
import { UsersModule } from '../users/users.module';
import { AccountEntriesModule } from '../account-entries/account-entries.module';
import { ExpensesModule } from '../expenses/expenses.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyMetric.name, schema: DailyMetricSchema },
      { name: EntryRecord.name, schema: EntryRecordSchema },
    ]),
    UsersModule,
    AccountEntriesModule,
    ExpensesModule,
  ],
  providers: [DailyMetricsService],
  exports: [DailyMetricsService, MongooseModule],
})
export class DailyMetricsModule {}
