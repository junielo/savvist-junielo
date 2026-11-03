import { Component, inject } from '@angular/core';
import { UserService } from '../../../core/services/user.service';
import { DashboardService } from '../services/dashboard.service';
import { CardComputedAmount } from '../components/card-computed-amount/card-computed-amount';
import { ApexGaugeLabel } from '../components/apex-gauge-label/apex-gauge-label';

@Component({
  imports: [CardComputedAmount, ApexGaugeLabel],
  selector: 'app-dashboard-page',
  styleUrl: './dashboard-page.scss',
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
  private readonly userService = inject(UserService);
  private readonly dashboardService = inject(DashboardService);

  protected readonly user = this.userService.user;
  protected readonly summary = this.dashboardService.summary;
  protected readonly todaysAllowance = this.dashboardService.todaysAllowance;
  protected readonly isLoadingSummary = this.dashboardService.isLoadingSummary;
  protected readonly summaryError = this.dashboardService.summaryError;
  protected readonly trend = this.dashboardService.trend;
  protected readonly isLoadingTrend = this.dashboardService.isLoadingTrend;
  protected readonly trendError = this.dashboardService.trendError;
}
