import { Injectable, Inject } from '@nestjs/common';
import { Types } from 'mongoose';
import { DailyMetricsService } from '../daily-metrics/daily-metrics.service';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DailyMetricsService)
    private readonly dailyMetricsService: DailyMetricsService,
  ) {}

  async getSummary(userId: Types.ObjectId) {
    return this.dailyMetricsService.getLatest(userId);
  }

  async getTrend(userId: Types.ObjectId, limit = 30) {
    return this.dailyMetricsService.getTrend(userId, limit);
  }
}
