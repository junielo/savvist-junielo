import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { DailyMetricsModule } from '../daily-metrics/daily-metrics.module';
import { UsersModule } from '../users/users.module';
import { CurrentUserGuard } from '../../common/current-user/current-user.guard';

@Module({
  imports: [DailyMetricsModule, UsersModule],
  controllers: [DashboardController],
  providers: [DashboardService, CurrentUserGuard],
  exports: [DashboardService],
})
export class DashboardModule {}
