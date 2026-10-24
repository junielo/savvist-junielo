import { Routes } from '@angular/router';

export const WISHLIST_ROUTES: Routes = [
  {
    path: '',
    title: 'Wishlist',
    loadComponent: () => import('./pages/wishlist-page').then(m => m.WishlistPage),
  },
];