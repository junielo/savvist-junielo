import { Component, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { ExpenseListItem } from '../components/expense-list-item/expense-list-item';
import { ExpenseListItemModel } from '../models/expense-list-tem';
import { ExpenseDialog } from '../dialogs/expense-dialog/expense-dialog';
import { ExpenseService } from '../services/expense.service';
import { ExpenseModel } from '../models/expense.model';

@Component({
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDividerModule, ExpenseListItem, DecimalPipe],
  selector: 'app-expenses-page',
  styleUrl: './expenses-page.scss',
  templateUrl: './expenses-page.html',
})
export class ExpensesPage {
  private readonly dialog = inject(MatDialog);
  private readonly expenseService = inject(ExpenseService);

  protected readonly expenses = this.expenseService.expenses;
  protected readonly isLoading = this.expenseService.isLoading;

  protected readonly totalExpense = computed(() =>
    this.expenses().reduce((sum, item) => sum + item.amount, 0),
  );

  protected openExpenseDialog(expense?: ExpenseModel): void {
    this.dialog.open(ExpenseDialog, {
      disableClose: true,
      width: '600px',
      data: expense ?? null,
    });
  }

  protected async deleteExpense(id: string): Promise<void> {
    try {
      await this.expenseService.remove(id);
    } catch {
      // Handled or ignored
    }
  }

  protected toListItemModel(expense: ExpenseModel): ExpenseListItemModel {
    return {
      id: expense.id,
      userId: expense.userId,
      name: expense.name,
      amount: expense.amount,
      dayOfMonth: expense.dayOfMonth,
      hasSelMonths: expense.months.length > 0,
    };
  }
}
