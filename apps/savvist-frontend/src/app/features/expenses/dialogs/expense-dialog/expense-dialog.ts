import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { AriaSelect } from '../../../../shared/layout/aria-select/aria-select';
import { ExpenseService } from '../../services/expense.service';
import { ExpenseModel } from '../../models/expense.model';
import { ApiError } from '../../../../core/http/api-error';

interface ExpenseFormValues {
  name: FormControl<string>;
  amount: FormControl<number | null>;
  date: FormControl<string | null>;
  months: FormControl<number[]>;
}

@Component({
  selector: 'app-expense-dialog',
  styleUrl: './expense-dialog.scss',
  templateUrl: './expense-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    AriaSelect,
  ],
})
export class ExpenseDialog {
  private readonly dialogRef = inject(MatDialogRef<ExpenseDialog>);
  private readonly expenseService = inject(ExpenseService);
  private readonly data = inject<ExpenseModel | null>(MAT_DIALOG_DATA, { optional: true });

  protected readonly isEdit = !!this.data;
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly expenseForm = new FormGroup<ExpenseFormValues>({
    name: new FormControl<string>(this.data?.name ?? '', { nonNullable: true }),
    amount: new FormControl<number | null>(this.data?.amount ?? null),
    date: new FormControl<string | null>(this.data ? String(this.data.dayOfMonth) : null),
    months: new FormControl<number[]>(this.data?.months ?? [], { nonNullable: true }),
  });

  protected readonly dateOptions = Array.from({ length: 31 }, (_, i) => String(i + 1));

  protected readonly monthsList = [
    { id: 1, name: 'January' },
    { id: 2, name: 'February' },
    { id: 3, name: 'March' },
    { id: 4, name: 'April' },
    { id: 5, name: 'May' },
    { id: 6, name: 'June' },
    { id: 7, name: 'July' },
    { id: 8, name: 'August' },
    { id: 9, name: 'September' },
    { id: 10, name: 'October' },
    { id: 11, name: 'November' },
    { id: 12, name: 'December' },
  ];

  protected close(): void {
    this.dialogRef.close();
  }

  protected async save(): Promise<void> {
    const name = this.expenseForm.value.name?.trim() ?? '';
    const amount = this.expenseForm.value.amount;
    const dateStr = this.expenseForm.value.date;
    const months = this.expenseForm.value.months ?? [];

    if (!name || amount === null || amount === undefined || !dateStr) {
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }

    const dayOfMonth = parseInt(dateStr, 10);
    if (isNaN(dayOfMonth)) {
      this.errorMessage.set('Please select a valid date.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    try {
      let result;
      if (this.isEdit && this.data) {
        result = await this.expenseService.update(this.data.id, {
          name,
          amount,
          dayOfMonth,
          months,
        });
      } else {
        result = await this.expenseService.create({
          name,
          amount,
          dayOfMonth,
          months,
        });
      }
      this.dialogRef.close(result);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.messages.join(' ')
          : this.isEdit
            ? 'Failed to update expense.'
            : 'Failed to create expense.';
      this.errorMessage.set(message);
    } finally {
      this.isSaving.set(false);
    }
  }
}
