import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { AriaSelect } from '../../../../shared/layout/aria-select/aria-select';

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

  protected readonly expenseForm = new FormGroup<ExpenseFormValues>({
    name: new FormControl<string>('', { nonNullable: true }),
    amount: new FormControl<number | null>(null),
    date: new FormControl<string | null>(null),
    months: new FormControl<number[]>([], { nonNullable: true }),
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
}
