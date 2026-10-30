import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ExpenseListItem } from '../components/expense-list-item/expense-list-item';
import { ExpenseListItemModel } from '../models/expense-list-tem';
import { ExpenseDialog } from '../dialogs/expense-dialog/expense-dialog';
import { ExpenseService } from '../services/expense.service';
import { ExpenseModel } from '../models/expense.model';
import { SharedDialog } from '../../../shared/layout/shared-dialog/shared-dialog';
import { ApiError } from '../../../core/http/api-error';

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
  protected readonly errorMessage = signal<string | null>(null);

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
    this.errorMessage.set(null);
    const dialogRef = this.dialog.open(SharedDialog, {
      data: {
        type: 'confirmation',
        title: 'Delete Expense',
        message: 'Are you sure you want to delete this expense?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    const confirmed = await firstValueFrom(dialogRef.afterClosed());
    if (!confirmed) {
      return;
    }

    try {
      await this.expenseService.remove(id);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.messages.join(' ')
          : 'Failed to delete expense.';
      this.errorMessage.set(message);
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
