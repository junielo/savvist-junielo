import { Component, inject } from '@angular/core';
import { UserService } from '../../../core/services/user.service';
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
  protected readonly user = this.userService.user;
}
