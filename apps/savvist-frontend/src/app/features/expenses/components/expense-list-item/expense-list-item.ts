import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DecimalPipe } from '@angular/common';
import { OrdinalPipe } from '../../../../shared/pipes/ordinal-pipe';
import { ExpenseListItemModel } from '../../models/expense-list-tem';

@Component({
  imports: [MatIconModule, MatButtonModule, DecimalPipe, OrdinalPipe],
  selector: 'app-expense-list-item',
  styleUrl: './expense-list-item.scss',
  templateUrl: './expense-list-item.html',
  standalone: true,
})
export class ExpenseListItem {
  readonly itemData = input.required<ExpenseListItemModel>();
  readonly edit = output<void>();
  readonly delete = output<void>();

  protected onEdit(): void {
    this.edit.emit();
  }

  protected onDelete(): void {
    this.delete.emit();
  }
}
