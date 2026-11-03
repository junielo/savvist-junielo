import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { DailyMetricsModule } from '../daily-metrics/daily-metrics.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [DailyMetricsModule, UsersModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
