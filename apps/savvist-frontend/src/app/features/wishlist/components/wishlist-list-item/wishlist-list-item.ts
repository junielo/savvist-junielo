import { Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AriaSelect } from '../../../../shared/layout/aria-select/aria-select';
import { BasicRadialBar } from '../../../../shared/charts/basic-radial-bar/basic-radial-bar';
import { WishlistType } from '../../models/wishlist-type';
import { WishlistListItemModel } from '../../models/wishlist-list-item';

@Component({
  imports: [DecimalPipe, MatIconModule, MatButtonModule, AriaSelect, BasicRadialBar],
  selector: 'app-wishlist-list-item',
  styleUrl: './wishlist-list-item.scss',
  templateUrl: './wishlist-list-item.html',
  standalone: true,
})
export class WishlistListItem {
  readonly wishlistTypes = Object.values(WishlistType);

  readonly itemData = input.required<WishlistListItemModel>();
  readonly edit = output<void>();
  readonly delete = output<void>();
  readonly purchase = output<void>();
  readonly undoPurchase = output<void>();
  readonly typeChange = output<string>();

  protected onEdit(): void {
    this.edit.emit();
  }

  protected onDelete(): void {
    this.delete.emit();
  }

  protected onTogglePurchase(): void {
    if (this.itemData().isCompleted) {
      this.undoPurchase.emit();
    } else {
      this.purchase.emit();
    }
  }

  protected onTypeChange(newType: string): void {
    this.typeChange.emit(newType);
  }
}
