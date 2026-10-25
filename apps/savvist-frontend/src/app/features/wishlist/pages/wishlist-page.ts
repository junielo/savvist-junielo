import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { WishlistListItem } from '../components/wishlist-list-item/wishlist-list-item';
import { WishlistListItemModel } from '../../../../../../../libs/models/wishlist-list-item';
import { WishlistType } from '../../../../../../../libs/models/wishlist-type';

@Component({
  imports: [MatIconModule, MatButtonModule, MatDividerModule, WishlistListItem],
  selector: 'app-wishlist-page',
  styleUrl: './wishlist-page.scss',
  templateUrl: './wishlist-page.html',
})
export class WishlistPage {
  itemData: WishlistListItemModel[] = [
    {
      id: '000000000',
      userId: '000000000',
      name: 'Item number one',
      amount: 1000,
      type: WishlistType.NORMAL,
      isCompleted: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Item number one',
      amount: 1000,
      type: WishlistType.NORMAL,
      isCompleted: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Item number one',
      amount: 1000,
      type: WishlistType.NORMAL,
      isCompleted: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Item number one',
      amount: 1000,
      type: WishlistType.NORMAL,
      isCompleted: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Item number one',
      amount: 1000,
      type: WishlistType.NORMAL,
      isCompleted: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Item number one',
      amount: 1000,
      type: WishlistType.NORMAL,
      isCompleted: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Item number one',
      amount: 1000,
      type: WishlistType.NORMAL,
      isCompleted: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Item number one',
      amount: 1000,
      type: WishlistType.NORMAL,
      isCompleted: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Item number one',
      amount: 1000,
      type: WishlistType.NORMAL,
      isCompleted: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Item number one',
      amount: 1000,
      type: WishlistType.NORMAL,
      isCompleted: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Item number one',
      amount: 1000,
      type: WishlistType.NORMAL,
      isCompleted: false,
    },
    {
      id: '000000000',
      userId: '000000000',
      name: 'Item number one',
      amount: 1000,
      type: WishlistType.NORMAL,
      isCompleted: false,
    },
  ];
}
