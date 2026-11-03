import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  inject,
  viewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ChatSession } from '../../models/chat-session';
import { SharedDialog } from '../../../../shared/layout/shared-dialog/shared-dialog';

@Component({
  selector: 'app-sessions-panel',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, FormsModule],
  templateUrl: './sessions-panel.html',
  styleUrl: './sessions-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionsPanel {
  private readonly dialog = inject(MatDialog);

  readonly sessions = input.required<ChatSession[]>();
  readonly activeId = input<string | null>(null);

  // eslint-disable-next-line @angular-eslint/no-output-native
  readonly select = output<string>();
  readonly create = output<void>();
  readonly rename = output<{ id: string; title: string }>();
  readonly remove = output<string>();

  protected readonly editingId = signal<string | null>(null);
  protected readonly editTitle = signal<string>('');

  readonly renameInput = viewChild<ElementRef<HTMLInputElement>>('renameInput');

  protected onSelect(id: string): void {
    if (this.editingId() !== null) return;
    this.select.emit(id);
  }

  protected startRename(id: string, currentTitle: string, event?: Event): void {
    event?.stopPropagation();
    this.editingId.set(id);
    this.editTitle.set(currentTitle);
    setTimeout(() => {
      const inputEl = this.renameInput()?.nativeElement;
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    });
  }

  protected onEditHeaderClick(): void {
    const id = this.activeId();
    if (!id) return;
    const session = this.sessions().find((s) => s.id === id);
    if (session) {
      this.startRename(session.id, session.title);
    }
  }

  protected onDeleteHeaderClick(): void {
    const id = this.activeId();
    if (!id) return;
    this.confirmDelete(id);
  }

  protected saveRename(id: string): void {
    const trimmed = this.editTitle().trim();
    if (!trimmed) {
      this.editingId.set(null);
      return;
    }
    const finalTitle = trimmed.slice(0, 100);
    this.rename.emit({ id, title: finalTitle });
    this.editingId.set(null);
  }

  protected cancelRename(): void {
    this.editingId.set(null);
  }

  protected async confirmDelete(id: string, event?: Event): Promise<void> {
    event?.stopPropagation();
    const session = this.sessions().find((s) => s.id === id);
    const title = session ? session.title : 'this session';

    const dialogRef = this.dialog.open(SharedDialog, {
      data: {
        type: 'Confirmation',
        title: 'Delete Session',
        message: `Are you sure you want to delete "${title}"? This session and its messages will be removed.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    const confirmed = await firstValueFrom(dialogRef.afterClosed());
    if (confirmed) {
      this.remove.emit(id);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const list = this.sessions();
    if (list.length === 0) return;
    const currentId = this.activeId();
    const currentIndex = list.findIndex((s) => s.id === currentId);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = currentIndex < list.length - 1 ? currentIndex + 1 : 0;
      this.select.emit(list[nextIndex].id);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : list.length - 1;
      this.select.emit(list[prevIndex].id);
    } else if (event.key === 'F2' && currentId && this.editingId() === null) {
      event.preventDefault();
      const session = list.find((s) => s.id === currentId);
      if (session) {
        this.startRename(session.id, session.title);
      }
    }
  }
}
