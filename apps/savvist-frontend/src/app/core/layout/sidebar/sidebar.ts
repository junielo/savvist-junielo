import { Component } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';

@Component({
  selector: 'app-sidebar',
  styleUrl: './sidebar.scss',
  templateUrl: './sidebar.html',
  imports: [MatSidenavModule],
})
export class Sidebar {}
