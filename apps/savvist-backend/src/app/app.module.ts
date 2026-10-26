import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AccountEntriesModule } from './modules/account-entries/account-entries.module';
import { EntryRecordsModule } from './modules/entry-records/entry-records.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { RecordLogsModule } from './modules/record-logs/record-logs.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DailyMetricsModule } from './modules/daily-metrics/daily-metrics.module';
import { ChatModule } from './modules/chat/chat.module';
import { DatabaseModule } from './database/database.module';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      cache: true,
    }),
    DatabaseModule,
    UsersModule,
    AccountEntriesModule,
    EntryRecordsModule,
    ExpensesModule,
    WishlistModule,
    RecordLogsModule,
    DashboardModule,
    DailyMetricsModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
