import { Module } from '@nestjs/common';
import { DailyMetricsService } from './daily-metrics.service';

@Module({
  providers: [DailyMetricsService],
})
export class DailyMetricsModule {}
