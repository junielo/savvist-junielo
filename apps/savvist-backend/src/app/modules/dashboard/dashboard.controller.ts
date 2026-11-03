import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { CurrentUser } from '../../common/current-user/current-user.decorator';
import { CurrentUserGuard } from '../../common/current-user/current-user.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { DashboardService } from './dashboard.service';

@UseGuards(CurrentUserGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    @Inject(DashboardService)
    private readonly dashboardService: DashboardService,
  ) {}

  @Get('summary')
  getSummary(@CurrentUser() user: UserDocument) {
    return this.dashboardService.getSummary(user._id);
  }

  @Get('trend')
  getTrend(
    @CurrentUser() user: UserDocument,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 30;
    return this.dashboardService.getTrend(user._id, limitNum);
  }
}
