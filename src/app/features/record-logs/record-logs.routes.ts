import { Routes } from '@angular/router';

export const RECORD_LOGS_ROUTES: Routes = [
  {
    path: '',
    title: 'Record Logs',
    loadComponent: () => import('./pages/record-logs-page').then(m => m.RecordLogsPage),
  },
];