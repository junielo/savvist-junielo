import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';

import { SessionsPanel } from '../components/sessions-panel/sessions-panel';
import { MessageThread } from '../components/message-thread/message-thread';
import { MessageComposer } from '../components/message-composer/message-composer';
import { ChatSession } from '../models/chat-session';
import { ChatMessage } from '../models/chat-message';
import { MOCK_SESSIONS, MOCK_MESSAGES } from '../data/chat.mock-data';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    SessionsPanel,
    MessageThread,
    MessageComposer,
  ],
  templateUrl: './chat-page.html',
  styleUrl: './chat-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPage implements OnInit, OnDestroy {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private breakpointSub?: Subscription;

  readonly sessions = signal<ChatSession[]>(
    MOCK_SESSIONS.map((s) => ({ ...s }))
  );
  readonly activeId = signal<string | null>(
    MOCK_SESSIONS[0]?.id || null
  );
  readonly messagesBySession = signal<Record<string, ChatMessage[]>>(
    JSON.parse(JSON.stringify(MOCK_MESSAGES))
  );

  readonly isResponding = signal(false);
  readonly mobileDrawerOpen = signal(false);
  readonly isMobile = signal(false);

  readonly activeMessages = computed(() => {
    const id = this.activeId();
    if (!id) return [];
    return this.messagesBySession()[id] || [];
  });

  readonly activeSessionTitle = computed(() => {
    const id = this.activeId();
    if (!id) return '';
    const session = this.sessions().find((s) => s.id === id);
    return session ? session.title : '';
  });

  readonly isComposerDisabled = computed(() => {
    return this.isResponding() || !this.activeId();
  });

  ngOnInit(): void {
    this.breakpointSub = this.breakpointObserver
      .observe([Breakpoints.Handset, Breakpoints.Tablet])
      .subscribe((result) => {
        this.isMobile.set(result.matches);
      });
  }

  ngOnDestroy(): void {
    this.breakpointSub?.unsubscribe();
  }

  protected onSelectSession(id: string): void {
    this.activeId.set(id);
    if (this.isMobile()) {
      this.mobileDrawerOpen.set(false);
    }
  }

  protected onCreateSession(): void {
    const newId = 'session_' + Date.now();
    const newSession: ChatSession = {
      id: newId,
      title: 'New chat',
    };
    this.sessions.update((list) => [newSession, ...list]);
    this.messagesBySession.update((map) => ({ ...map, [newId]: [] }));
    this.activeId.set(newId);
    if (this.isMobile()) {
      this.mobileDrawerOpen.set(false);
    }
  }

  protected onRenameSession(event: { id: string; title: string }): void {
    this.sessions.update((list) =>
      list.map((s) => (s.id === event.id ? { ...s, title: event.title } : s))
    );
  }

  protected onRemoveSession(id: string): void {
    const currentSessions = this.sessions();
    const index = currentSessions.findIndex((s) => s.id === id);
    if (index === -1) return;

    const updatedSessions = currentSessions.filter((s) => s.id !== id);
    this.sessions.set(updatedSessions);

    this.messagesBySession.update((map) => {
      const copy = { ...map };
      delete copy[id];
      return copy;
    });

    if (this.activeId() === id) {
      if (updatedSessions.length > 0) {
        const nextIndex = Math.min(index, updatedSessions.length - 1);
        this.activeId.set(updatedSessions[nextIndex].id);
      } else {
        this.activeId.set(null);
      }
    }
  }

  protected onSendMessage(content: string): void {
    const activeId = this.activeId();
    if (!activeId || this.isResponding()) return;

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now() + '_user',
      role: 'user',
      content,
      status: 'complete',
    };

    this.messagesBySession.update((map) => ({
      ...map,
      [activeId]: [...(map[activeId] || []), userMsg],
    }));

    this.isResponding.set(true);

    // TEMP: canned assistant reply after 600ms
    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: 'msg_' + Date.now() + '_assistant',
        role: 'assistant',
        content: 'Here is your assistant response regarding your query. Everything looks on track!',
        status: 'complete',
      };

      this.messagesBySession.update((map) => ({
        ...map,
        [activeId]: [...(map[activeId] || []), assistantMsg],
      }));
      this.isResponding.set(false);
    }, 600);
  }

  protected onRetryMessage(msgId: string): void {
    const activeId = this.activeId();
    if (!activeId) return;

    this.messagesBySession.update((map) => {
      const messages = map[activeId] || [];
      const updated = messages.map((m) => {
        if (m.id === msgId) {
          return {
            ...m,
            status: 'complete' as const,
            content: m.content + ' (Successfully retried and resolved)',
          };
        }
        return m;
      });
      return { ...map, [activeId]: updated };
    });
  }

  protected toggleMobileDrawer(): void {
    this.mobileDrawerOpen.update((v) => !v);
  }
}
