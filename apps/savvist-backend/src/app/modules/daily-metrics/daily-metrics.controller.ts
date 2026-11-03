import { Body, Controller, Get, Inject, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/current-user/current-user.decorator';
import { CurrentUserGuard } from '../../common/current-user/current-user.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { DailyMetricsService } from './daily-metrics.service';
import { ComputeDailyMetricDto } from './dto/compute-daily-metric.dto';

@UseGuards(CurrentUserGuard)
@Controller('daily-metrics')
export class DailyMetricsController {
  constructor(
    @Inject(DailyMetricsService)
    private readonly dailyMetricsService: DailyMetricsService,
  ) {}

  @Post('compute')
  compute(
    @CurrentUser() user: UserDocument,
    @Body() dto: ComputeDailyMetricDto,
  ) {
    return this.dailyMetricsService.computeAndSaveForDay(user._id, dto.day);
  }

  @Get('allowance')
  getAllowance(
    @CurrentUser() user: UserDocument,
    @Query('day') day?: string,
  ) {
    return this.dailyMetricsService.getTodaysAllowance(user._id, day);
  }
}
