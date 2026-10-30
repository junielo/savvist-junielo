import { Component, inject } from '@angular/core';
import { UserService } from '../../../core/services/user.service';

@Component({
  imports: [],
  selector: 'app-dashboard-page',
  styleUrl: './dashboard-page.scss',
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
  private readonly userService = inject(UserService);
  protected readonly user = this.userService.user;
}
