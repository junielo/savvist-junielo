import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ExpenseListItemModel } from '../../../../../../../../libs/models/expense-list-tem';
import { DecimalPipe } from '@angular/common';
import { OrdinalPipe } from '../../../../shared/pipes/ordinal-pipe';

@Component({
  imports: [MatIconModule, MatButtonModule, DecimalPipe, OrdinalPipe],
  selector: 'app-expense-list-item',
  styleUrl: './expense-list-item.scss',
  templateUrl: './expense-list-item.html',
  standalone: true,
})
export class ExpenseListItem {
  itemData = input.required<ExpenseListItemModel>();
}
