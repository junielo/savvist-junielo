import { Component, ChangeDetectionStrategy, inject, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';

export type AppDialogType = 'Confirmation' | 'Alert' | 'Warning' | 'Error' | 'confirmation' | 'alert' | 'warning' | 'error';

export interface AppDialogData {
  type?: AppDialogType;
  title?: string;
  message?: string;
  callback?: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
}

function getDefaultTitle(type: string): string {
  switch (type) {
    case 'confirmation':
      return 'Confirm Action';
    case 'warning':
      return 'Warning';
    case 'error':
      return 'Error Occurred';
    case 'alert':
    default:
      return 'Alert';
  }
}

@Component({
  selector: 'app-shared-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
  ],
  templateUrl: './shared-dialog.html',
  styleUrl: './shared-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharedDialog {
  private readonly dialogRef = inject(MatDialogRef<SharedDialog>, { optional: true });
  protected readonly data = inject<AppDialogData>(MAT_DIALOG_DATA, { optional: true });

  readonly type = input<AppDialogType>('Alert');
  readonly title = input<string>('');
  readonly message = input<string>('');
  readonly callback = input<() => void | Promise<void>>();
  readonly confirmText = input<string>('Confirm');
  readonly cancelText = input<string>('Cancel');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected readonly resolvedType = computed(() => {
    return (this.data?.type ?? this.type() ?? 'Alert').toLowerCase() as Lowercase<AppDialogType>;
  });

  protected readonly resolvedTitle = computed(() => {
    return (this.data?.title ?? this.title()) || getDefaultTitle(this.resolvedType());
  });

  protected readonly resolvedMessage = computed(() => {
    return this.data?.message ?? this.message() ?? '';
  });

  protected readonly resolvedCallback = computed(() => {
    return this.data?.callback ?? this.callback();
  });

  protected readonly iconName = computed(() => {
    switch (this.resolvedType()) {
      case 'confirmation':
        return 'help_outline';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'alert':
      default:
        return 'info';
    }
  });

  protected readonly iconClass = computed(() => {
    return `dialog-icon-${this.resolvedType()}`;
  });

  protected readonly isConfirmation = computed(() => {
    return this.resolvedType() === 'confirmation';
  });

  protected async onConfirm(): Promise<void> {
    const cb = this.resolvedCallback();
    if (cb) {
      try {
        await cb();
      } catch (err) {
        console.error('Dialog callback execution error:', err);
      }
    }
    this.confirmed.emit();
    if (this.dialogRef) {
      this.dialogRef.close(true);
    }
  }

  protected onCancel(): void {
    this.cancelled.emit();
    if (this.dialogRef) {
      this.dialogRef.close(false);
    }
  }
}
