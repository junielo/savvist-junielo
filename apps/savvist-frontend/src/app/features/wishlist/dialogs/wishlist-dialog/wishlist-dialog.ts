import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { WishlistType } from '../../models/wishlist-type';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AriaSelect } from '../../../../shared/layout/aria-select/aria-select';
import { WishlistService } from '../../services/wishlist.service';
import { WishlistListItemModel } from '../../models/wishlist-list-item';
import { ApiError } from '../../../../core/http/api-error';

interface WishlistFormValues {
  name: FormControl<string>;
  amount: FormControl<number | null>;
  type: FormControl<string>;
}

@Component({
  selector: 'app-wishlist-dialog',
  styleUrl: './wishlist-dialog.scss',
  templateUrl: './wishlist-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    AriaSelect,
  ],
})
export class WishlistDialog {
  private readonly dialogRef = inject(MatDialogRef<WishlistDialog>);
  private readonly wishlistService = inject(WishlistService);
  private readonly data = inject<WishlistListItemModel | null>(MAT_DIALOG_DATA, { optional: true });

  protected readonly isEdit = !!this.data;
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly wishlistType = Object.values(WishlistType);

  protected readonly wishlistForm = new FormGroup<WishlistFormValues>({
    name: new FormControl<string>(this.data?.name ?? '', { nonNullable: true }),
    amount: new FormControl<number | null>(this.data?.amount ?? null),
    type: new FormControl<string>(this.data?.type ?? WishlistType.NORMAL, { nonNullable: true }),
  });

  protected close(): void {
    this.dialogRef.close();
  }

  protected async save(): Promise<void> {
    const name = this.wishlistForm.value.name?.trim() ?? '';
    const amount = this.wishlistForm.value.amount;
    const type = this.wishlistForm.value.type ?? WishlistType.NORMAL;

    if (!name || amount === null || amount === undefined) {
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    try {
      let result;
      if (this.isEdit && this.data) {
        result = await this.wishlistService.update(this.data.id, {
          name,
          amount,
          type,
        });
      } else {
        result = await this.wishlistService.create({
          name,
          amount,
          type,
        });
      }
      this.dialogRef.close(result);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.messages.join(' ')
          : this.isEdit
            ? 'Failed to update wishlist item.'
            : 'Failed to create wishlist item.';
      this.errorMessage.set(message);
    } finally {
      this.isSaving.set(false);
    }
  }
}
