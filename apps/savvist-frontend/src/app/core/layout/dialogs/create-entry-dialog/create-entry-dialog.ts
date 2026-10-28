import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialog,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { TitleCasePipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AddEntryDialog } from '../add-entry-dialog/add-entry-dialog';
import { AccountEntriesService } from '../../../services/account-entries.service';
import { AccountEntryModel } from '../../../models/account-entry';
import { ApiError } from '../../../http/api-error';

@Component({
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    FormsModule,
    ReactiveFormsModule,
    TitleCasePipe,
  ],
  providers: [provideNativeDateAdapter()],
  selector: 'app-create-entry-dialog',
  styleUrl: './create-entry-dialog.scss',
  templateUrl: './create-entry-dialog.html',
})
export class CreateEntryDialog {
  private readonly dialogRef = inject(MatDialogRef<CreateEntryDialog>);
  private readonly dialog = inject(MatDialog);
  private readonly accountEntriesService = inject(AccountEntriesService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly entries = this.accountEntriesService.entries;
  protected readonly balances: Record<string, number> = {};

  protected readonly entryForm = new FormGroup({
    date: new FormControl(new Date()),
  });

  protected close(): void {
    this.dialogRef.close();
  }

  protected openNewEntryDialog(): void {
    this.dialog.open(AddEntryDialog, {
      disableClose: true,
      width: '400px',
    });
  }

  protected editEntry(entry: AccountEntryModel): void {
    this.dialog.open(AddEntryDialog, {
      disableClose: true,
      width: '400px',
      data: entry,
    });
  }

  protected async deleteEntry(id: string): Promise<void> {
    try {
      await this.accountEntriesService.deleteEntry(id);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.messages.join(' ')
          : 'Failed to delete account entry.';
      this.snackBar.open(message, 'Close', {
        duration: 5000,
      });
    }
  }
}

export { CreateEntryDialog as CreateEntry };
