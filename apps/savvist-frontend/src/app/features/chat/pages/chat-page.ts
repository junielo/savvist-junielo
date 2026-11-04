import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
  effect,
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
import { ChatMessage } from '../models/chat-message';
import { ConversationsService } from '../services/conversations.service';
import { MessagesService } from '../services/messages.service';

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
  private readonly conversationsService = inject(ConversationsService);
  private readonly messagesService = inject(MessagesService);
  private breakpointSub?: Subscription;

  readonly sessions = this.conversationsService.conversations;
  readonly isLoadingSessions = this.conversationsService.isLoading;
  readonly activeId = signal<string | null>(null);
  readonly messagesBySession = signal<Record<string, ChatMessage[]>>({});

  readonly isResponding = signal(false);
  readonly mobileDrawerOpen = signal(false);
  readonly isMobile = signal(false);

  constructor() {
    effect(() => {
      const list = this.sessions();
      const current = this.activeId();
      if (!current && list.length > 0) {
        this.activeId.set(list[0].id);
      }
    });

    effect(() => {
      const id = this.activeId();
      if (id && !this.messagesBySession()[id]) {
        this.loadMessages(id);
      }
    });
  }

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

  private async loadMessages(sessionId: string): Promise<void> {
    try {
      const messages = await this.messagesService.findAll(sessionId);
      this.messagesBySession.update((map) => ({
        ...map,
        [sessionId]: messages,
      }));
    } catch {
      this.messagesBySession.update((map) => ({
        ...map,
        [sessionId]: [],
      }));
    }
  }

  protected async onSelectSession(id: string): Promise<void> {
    this.activeId.set(id);
    if (!this.messagesBySession()[id]) {
      await this.loadMessages(id);
    }
    if (this.isMobile()) {
      this.mobileDrawerOpen.set(false);
    }
  }

  protected async onCreateSession(): Promise<void> {
    try {
      const newSession = await this.conversationsService.create({ title: 'New chat' });
      this.messagesBySession.update((map) => ({
        ...map,
        [newSession.id]: [],
      }));
      this.activeId.set(newSession.id);
      if (this.isMobile()) {
        this.mobileDrawerOpen.set(false);
      }
    } catch {
      // Handle error if needed
    }
  }

  protected async onRenameSession(event: { id: string; title: string }): Promise<void> {
    try {
      await this.conversationsService.update(event.id, { title: event.title });
    } catch {
      // Handle error if needed
    }
  }

  protected async onRemoveSession(id: string): Promise<void> {
    const currentSessions = this.sessions();
    const index = currentSessions.findIndex((s) => s.id === id);
    if (index === -1) return;

    try {
      await this.conversationsService.remove(id);
      const updatedSessions = this.sessions();

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
    } catch {
      // Handle error if needed
    }
  }

  protected async onSendMessage(content: string): Promise<void> {
    const activeId = this.activeId();
    if (!activeId || this.isResponding()) return;

    this.isResponding.set(true);

    try {
      const { userMessage, assistantMessage } = await this.messagesService.send(activeId, content);
      this.messagesBySession.update((map) => ({
        ...map,
        [activeId]: [...(map[activeId] || []), userMessage, assistantMessage],
      }));
    } catch {
      const errorMsg: ChatMessage = {
        id: 'msg_' + Date.now() + '_error',
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        status: 'error',
      };
      this.messagesBySession.update((map) => ({
        ...map,
        [activeId]: [...(map[activeId] || []), errorMsg],
      }));
    } finally {
      this.isResponding.set(false);
      this.conversationsService.reload();
    }
  }

  protected async onRetryMessage(msgId: string): Promise<void> {
    const activeId = this.activeId();
    if (!activeId) return;

    const messages = this.activeMessages();
    const failedMsg = messages.find((m) => m.id === msgId);
    if (!failedMsg) return;

    await this.onSendMessage(failedMsg.content);
  }

  protected toggleMobileDrawer(): void {
    this.mobileDrawerOpen.update((v) => !v);
  }
}
