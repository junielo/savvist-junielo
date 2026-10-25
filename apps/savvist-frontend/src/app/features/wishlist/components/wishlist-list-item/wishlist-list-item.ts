import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AriaSelect } from '../../../../shared/layout/aria-select/aria-select';
import { BasicRadialBar } from '../../../../shared/charts/basic-radial-bar/basic-radial-bar';
import { WishlistType } from '../../../../../../../../libs/models/wishlist-type';
import { WishlistListItemModel } from '../../../../../../../../libs/models/wishlist-list-item';

@Component({
  imports: [DecimalPipe, MatIconModule, MatButtonModule, AriaSelect, BasicRadialBar],
  selector: 'app-wishlist-list-item',
  styleUrl: './wishlist-list-item.scss',
  templateUrl: './wishlist-list-item.html',
})
export class WishlistListItem {
  readonly wishlistTypes = Object.values(WishlistType);

  itemData = input.required<WishlistListItemModel>();
}
