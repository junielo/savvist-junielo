import { Routes } from '@angular/router';

export const EXPENSES_ROUTES: Routes = [
  {
    path: '',
    title: 'Expenses',
    loadComponent: () => import('./pages/expenses-page').then(m => m.ExpensesPage),
  },
];