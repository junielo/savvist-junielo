import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  viewChild,
  ElementRef,
  afterRenderEffect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../models/chat-message';
import { MessageBubble } from '../message-bubble/message-bubble';

@Component({
  selector: 'app-message-thread',
  standalone: true,
  imports: [CommonModule, MessageBubble],
  templateUrl: './message-thread.html',
  styleUrl: './message-thread.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageThread {
  readonly messages = input.required<ChatMessage[]>();
  readonly retry = output<string>();

  readonly scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');

  constructor() {
    afterRenderEffect(() => {
      // Access messages() to track changes
      const currentMessages = this.messages();
      const el = this.scrollContainer()?.nativeElement;
      if (!el) return;

      const threshold = 80;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;

      if (isNearBottom || currentMessages.length <= 1) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }

  protected onRetry(id: string): void {
    this.retry.emit(id);
  }
}
