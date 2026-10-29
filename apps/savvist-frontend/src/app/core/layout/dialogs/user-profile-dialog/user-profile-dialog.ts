import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../../services/user.service';
import { ApiError } from '../../../http/api-error';

interface UserProfileFormValues {
  fullName: FormControl<string>;
  baseSalary: FormControl<number | null>;
  firstPayday: FormControl<number | null>;
  secondPayday: FormControl<number | null>;
  currentlyUnemployed: FormControl<boolean>;
}

@Component({
  selector: 'app-user-profile-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatIconModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
  ],
  templateUrl: './user-profile-dialog.html',
  styleUrl: './user-profile-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileDialog {
  private readonly dialogRef = inject<MatDialogRef<UserProfileDialog>>(MatDialogRef);
  private readonly userService = inject(UserService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly profileForm = new FormGroup<UserProfileFormValues>({
    fullName: new FormControl<string>('', { nonNullable: true }),
    baseSalary: new FormControl<number | null>(null),
    firstPayday: new FormControl<number | null>(null),
    secondPayday: new FormControl<number | null>(null),
    currentlyUnemployed: new FormControl<boolean>(false, { nonNullable: true }),
  });

  constructor() {
    const user = this.userService.user();
    if (user) {
      this.profileForm.patchValue({
        fullName: user.displayName,
        baseSalary: user.baseSalary,
        firstPayday: user.salaryDay1 ?? null,
        secondPayday: user.salaryDay2 ?? null,
        currentlyUnemployed: user.isUnemployed,
      });
    }
  }

  protected close(): void {
    this.dialogRef.close();
  }

  protected async save(): Promise<void> {
    if (this.profileForm.invalid) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const formValues = this.profileForm.value;

    try {
      await this.userService.updateUser({
        displayName: formValues.fullName?.trim() || undefined,
        baseSalary: formValues.baseSalary !== null ? Number(formValues.baseSalary) : undefined,
        salaryDay1: formValues.firstPayday !== null ? Number(formValues.firstPayday) : undefined,
        salaryDay2: formValues.secondPayday !== null ? Number(formValues.secondPayday) : undefined,
        isUnemployed: formValues.currentlyUnemployed ?? false,
      });
      this.dialogRef.close(true);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.messages.join(' ')
          : 'Failed to update user profile.';
      this.errorMessage.set(message);
      this.snackBar.open(message, 'Close', {
        duration: 5000,
      });
    } finally {
      this.isSaving.set(false);
    }
  }
}
