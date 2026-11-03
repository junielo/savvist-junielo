import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  viewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-message-composer',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule],
  templateUrl: './message-composer.html',
  styleUrl: './message-composer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageComposer {
  readonly disabled = input(false);
  readonly send = output<string>();

  protected readonly text = signal('');
  readonly textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('textareaEl');

  protected readonly isSendDisabled = computed(() => {
    return this.disabled() || !this.text().trim();
  });

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.triggerSend();
    }
  }

  protected triggerSend(): void {
    const trimmed = this.text().trim();
    if (!trimmed || this.disabled()) return;
    this.send.emit(trimmed);
    this.text.set('');
    const el = this.textareaRef()?.nativeElement;
    if (el) {
      el.value = '';
    }
  }
}
