import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { ExpenseListItem } from '../components/expense-list-item/expense-list-item';
import { ExpenseListItemModel } from '../models/expense-list-tem';
import { ExpenseDialog } from '../dialogs/expense-dialog/expense-dialog';

@Component({
  imports: [MatButtonModule, MatIconModule, MatDividerModule, ExpenseListItem],
  selector: 'app-expenses-page',
  styleUrl: './expenses-page.scss',
  templateUrl: './expenses-page.html',
})
export class ExpensesPage {
  private readonly dialog = inject(MatDialog);

  protected openExpenseDialog(): void {
    this.dialog.open(ExpenseDialog, {
      disableClose: true,
      width: '600px',
    });
  }

  temp_items: ExpenseListItemModel[] = [
    {
      id: '000000000',
      userId: '000000000',
      name: 'Sample Expense',
      amount: 1000,
      dayOfMonth: 21,
      hasSelMonths: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Sample Expense',
      amount: 1000,
      dayOfMonth: 21,
      hasSelMonths: true,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Sample Expense',
      amount: 1000,
      dayOfMonth: 21,
      hasSelMonths: true,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Sample Expense',
      amount: 1000,
      dayOfMonth: 21,
      hasSelMonths: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Sample Expense',
      amount: 1000,
      dayOfMonth: 21,
      hasSelMonths: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Sample Expense',
      amount: 1000,
      dayOfMonth: 21,
      hasSelMonths: true,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Sample Expense',
      amount: 1000,
      dayOfMonth: 21,
      hasSelMonths: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Sample Expense',
      amount: 1000,
      dayOfMonth: 21,
      hasSelMonths: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Sample Expense',
      amount: 1000,
      dayOfMonth: 21,
      hasSelMonths: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Sample Expense',
      amount: 1000,
      dayOfMonth: 21,
      hasSelMonths: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Sample Expense',
      amount: 1000,
      dayOfMonth: 21,
      hasSelMonths: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Sample Expense',
      amount: 1000,
      dayOfMonth: 21,
      hasSelMonths: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Sample Expense',
      amount: 1000,
      dayOfMonth: 21,
      hasSelMonths: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Sample Expense',
      amount: 1000,
      dayOfMonth: 21,
      hasSelMonths: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Sample Expense',
      amount: 1000,
      dayOfMonth: 21,
      hasSelMonths: false,
    },
  ];
}
