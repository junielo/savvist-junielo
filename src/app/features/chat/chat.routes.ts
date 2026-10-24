import { Routes } from '@angular/router';

export const CHAT_ROUTES: Routes = [
  {
    path: '',
    title: 'Chat',
    loadComponent: () => import('./pages/chat-page').then(m => m.ChatPage),
  },
];