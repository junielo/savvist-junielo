import {
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  linkedSignal,
  resource,
} from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialog,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { TitleCasePipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';
import { AddEntryDialog } from '../add-entry-dialog/add-entry-dialog';
import { AccountEntriesService } from '../../../services/account-entries.service';
import { EntryRecordsService } from '../../../services/entry-records.service';
import { AccountEntryModel, EntryRecordModel } from '../../../models/account-entry';
import { ApiError } from '../../../http/api-error';

const SAVE_DEBOUNCE_MS = 500;

/** Local-time YYYY-MM-DD (avoids the UTC shift of toISOString). */
function toDay(value: Date | string): string {
  const d = new Date(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dayNum = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayNum}`;
}

interface PendingSave {
  timer: ReturnType<typeof setTimeout>;
  day: string;
  balance: number | null;
}

@Component({
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    FormsModule,
    ReactiveFormsModule,
    TitleCasePipe,
  ],
  providers: [provideNativeDateAdapter()],
  selector: 'app-create-entry-dialog',
  styleUrl: './create-entry-dialog.scss',
  templateUrl: './create-entry-dialog.html',
})
export class CreateEntryDialog implements OnDestroy {
  private readonly dialogRef = inject<MatDialogRef<CreateEntryDialog>>(MatDialogRef);
  private readonly dialog = inject(MatDialog);
  private readonly accountEntriesService = inject(AccountEntriesService);
  private readonly entryRecordsService = inject(EntryRecordsService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly entries = this.accountEntriesService.entries;

  protected readonly entryForm = new FormGroup({
    date: new FormControl<Date | null>(new Date()),
  });

  private readonly dateValue = toSignal(this.entryForm.controls.date.valueChanges, {
    initialValue: this.entryForm.controls.date.value,
  });

  private readonly day = computed(() => {
    const v = this.dateValue();
    return v ? toDay(v) : undefined;
  });

  /** Reloads automatically whenever the selected day changes; stale responses are discarded. */
  private readonly records = resource({
    params: () => this.day(),
    loader: ({ params: day }) => this.entryRecordsService.getRecords({ date: day }),
    defaultValue: [] as EntryRecordModel[],
  });

  protected readonly isLoadingRecords = this.records.isLoading;

  /**
   * accountEntryId -> balance. Resets from the server data every time the records
   * change (including when switching to a day with no data), and can be edited locally.
   */
  protected readonly balances = linkedSignal<EntryRecordModel[], Record<string, number | null>>({
    source: this.records.value,
    computation: (records) =>
      Object.fromEntries(records.map((r) => [r.accountEntryId, r.balance])),
  });

  private readonly pending = new Map<string, PendingSave>();

  constructor() {
    effect(() => {
      const err = this.records.error();
      if (!err) return;
      this.showError(err, 'Failed to fetch entry records.');
    });
  }

  ngOnDestroy(): void {
    void this.flushPending();
  }

  protected onBalanceInput(entryId: string, value: number | null): void {
    const day = this.day();
    if (!day) return;

    const balance = value === null || value === undefined || Number.isNaN(value) ? null : Number(value);
    this.balances.update((b) => ({ ...b, [entryId]: balance }));

    // Key by entry + day so a pending save for one day can never be overwritten by another day.
    const key = `${entryId}|${day}`;
    const existing = this.pending.get(key);
    if (existing) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
      this.pending.delete(key);
      void this.persist(entryId, day, balance);
    }, SAVE_DEBOUNCE_MS);

    this.pending.set(key, { timer, day, balance });
  }

  private async persist(entryId: string, day: string, balance: number | null): Promise<void> {
    try {
      if (balance === null) {
        // Field was cleared -> remove the record for that day.
        await this.entryRecordsService.deleteBalance({ accountEntryId: entryId, day });
      } else {
        await this.entryRecordsService.upsertAmount({ accountEntryId: entryId, day, balance });
      }
    } catch (err: unknown) {
      this.showError(err, 'Failed to save balance.');
    }
  }

  /** Immediately sends any edits still waiting on the debounce timer. */
  private async flushPending(): Promise<void> {
    const jobs: Promise<void>[] = [];
    for (const [key, p] of this.pending) {
      clearTimeout(p.timer);
      jobs.push(this.persist(key.split('|')[0], p.day, p.balance));
    }
    this.pending.clear();
    await Promise.all(jobs);
  }

  protected async close(): Promise<void> {
    await this.flushPending();
    this.dialogRef.close();
  }

  protected openNewEntryDialog(): void {
    this.dialog.open(AddEntryDialog, {
      disableClose: true,
      width: '400px',
    });
  }

  protected editEntry(entry: AccountEntryModel): void {
    this.dialog.open(AddEntryDialog, {
      disableClose: true,
      width: '400px',
      data: entry,
    });
  }

  protected async deleteEntry(id: string): Promise<void> {
    try {
      await this.accountEntriesService.deleteEntry(id);
    } catch (err: unknown) {
      this.showError(err, 'Failed to delete account entry.');
    }
  }

  private showError(err: unknown, fallback: string): void {
    const message = err instanceof ApiError ? err.messages.join(' ') : fallback;
    this.snackBar.open(message, 'Close', { duration: 5000 });
  }
}

export { CreateEntryDialog as CreateEntry };