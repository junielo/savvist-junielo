import { Component, inject } from '@angular/core';
import { TopBar } from '../top-bar/top-bar';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  imports: [TopBar, RouterOutlet, MatSidenavModule, MatButtonModule, MatIconModule],
  selector: 'app-shell',
  styleUrl: './shell.scss',
  templateUrl: './shell.html',
})
export class Shell {
  public readonly router = inject(Router);

  SELECTED_NAV = {
    DASHBOARD: 'dashboard',
    CHAT: 'chat',
    EXPENSES: 'expenses',
    WISHLIST: 'wishlist',
    RECORD_LOGS: 'record-logs',
  };

  NavSelected(nav: string) {
    this.router.navigate([nav]);
  }
}
