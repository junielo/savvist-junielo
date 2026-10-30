import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { WishlistListItem } from '../components/wishlist-list-item/wishlist-list-item';
import { WishlistListItemModel } from '../models/wishlist-list-item';
import { WishlistDialog } from '../dialogs/wishlist-dialog/wishlist-dialog';
import { WishlistService } from '../services/wishlist.service';
import { SharedDialog } from '../../../shared/layout/shared-dialog/shared-dialog';
import { ApiError } from '../../../core/http/api-error';

@Component({
  imports: [CommonModule, MatIconModule, MatButtonModule, MatDividerModule, WishlistListItem, DecimalPipe],
  selector: 'app-wishlist-page',
  styleUrl: './wishlist-page.scss',
  templateUrl: './wishlist-page.html',
})
export class WishlistPage {
  private readonly dialog = inject(MatDialog);
  private readonly wishlistService = inject(WishlistService);

  protected readonly wishlist = this.wishlistService.wishlist;
  protected readonly isLoading = this.wishlistService.isLoading;
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly totalAmount = computed(() =>
    this.wishlist().reduce((sum, item) => sum + item.amount, 0),
  );

  protected openWishlistDialog(item?: WishlistListItemModel): void {
    this.dialog.open(WishlistDialog, {
      disableClose: true,
      width: '600px',
      data: item ?? null,
    });
  }

  protected async purchase(id: string): Promise<void> {
    this.errorMessage.set(null);
    try {
      await this.wishlistService.purchase(id);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.messages.join(' ') : 'Failed to mark wishlist item as purchased.';
      this.errorMessage.set(message);
    }
  }

  protected async undoPurchase(id: string): Promise<void> {
    this.errorMessage.set(null);
    try {
      await this.wishlistService.undoPurchase(id);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.messages.join(' ') : 'Failed to undo wishlist purchase.';
      this.errorMessage.set(message);
    }
  }

  protected async updateType(id: string, type: string): Promise<void> {
    this.errorMessage.set(null);
    try {
      await this.wishlistService.updateType(id, type);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.messages.join(' ') : 'Failed to update wishlist item type.';
      this.errorMessage.set(message);
    }
  }

  protected async deleteWishlist(id: string): Promise<void> {
    this.errorMessage.set(null);
    const dialogRef = this.dialog.open(SharedDialog, {
      data: {
        type: 'confirmation',
        title: 'Delete Wishlist Item',
        message: 'Are you sure you want to delete this wishlist item?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    const confirmed = await firstValueFrom(dialogRef.afterClosed());
    if (!confirmed) {
      return;
    }

    try {
      await this.wishlistService.remove(id);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.messages.join(' ')
          : 'Failed to delete wishlist item.';
      this.errorMessage.set(message);
    }
  }
}
