import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { AriaSelect } from '../../../../shared/layout/aria-select/aria-select';
import { AccountType } from '../../../../../../../../libs/models/account-type';
import { AccountEntriesService } from '../../../services/account-entries.service';
import { AccountEntryModel } from '../../../models/account-entry';
import { ApiError } from '../../../http/api-error';

@Component({
  selector: 'app-add-entry-dialog',
  styleUrl: './add-entry-dialog.scss',
  templateUrl: './add-entry-dialog.html',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    AriaSelect,
  ],
})
export class AddEntryDialog {
  private readonly dialogRef = inject(MatDialogRef<AddEntryDialog>);
  private readonly accountEntriesService = inject(AccountEntriesService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly data = inject<AccountEntryModel | null>(MAT_DIALOG_DATA, { optional: true });

  protected readonly isEdit = !!this.data;
  protected readonly value = signal(this.data?.name ?? '');
  protected readonly entryType = signal<AccountType>(
    this.data ? (this.data.type as unknown as AccountType) : AccountType.CASH,
  );
  protected readonly entryTypes = Object.values(AccountType);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected close(): void {
    this.dialogRef.close();
  }

  protected async save(): Promise<void> {
    const name = this.value().trim();
    if (!name) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);

    try {
      let result;
      if (this.isEdit && this.data) {
        result = await this.accountEntriesService.updateEntry(this.data.id, {
          name,
          type: this.entryType(),
        });
      } else {
        result = await this.accountEntriesService.createEntry(
          name,
          this.entryType(),
        );
      }
      this.dialogRef.close(result);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.messages.join(' ')
          : this.isEdit
            ? 'Failed to update account entry.'
            : 'Failed to create account entry.';
      this.errorMessage.set(message);
      this.snackBar.open(message, 'Close', {
        duration: 5000,
      });
    } finally {
      this.isSaving.set(false);
    }
  }
}

export { AddEntryDialog as AddEntry };
