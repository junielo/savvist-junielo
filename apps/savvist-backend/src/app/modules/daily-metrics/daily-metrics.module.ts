import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DailyMetricsService } from './daily-metrics.service';
import { DailyMetricsController } from './daily-metrics.controller';
import { DailyMetric, DailyMetricSchema } from './schemas/daily-metric.schema';
import { EntryRecord, EntryRecordSchema } from '../entry-records/schemas/entry-record.schema';
import { UsersModule } from '../users/users.module';
import { AccountEntriesModule } from '../account-entries/account-entries.module';
import { ExpensesModule } from '../expenses/schemas/../expenses.module';

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
  controllers: [DailyMetricsController],
  providers: [DailyMetricsService],
  exports: [DailyMetricsService, MongooseModule],
})
export class DailyMetricsModule {}
