import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateEntryDialog } from './create-entry-dialog';
import { AccountEntriesService } from '../../../services/account-entries.service';
import { EntryRecordsService } from '../../../services/entry-records.service';

describe('CreateEntryDialog', () => {
  let component: CreateEntryDialog;
  let fixture: ComponentFixture<CreateEntryDialog>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockAccountEntriesService: { entries: ReturnType<typeof signal> };
  let mockEntryRecordsService: {
    upsertAmount: ReturnType<typeof vi.fn>;
    getRecords: ReturnType<typeof vi.fn>;
    deleteBalance: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockDialogRef = {
      close: vi.fn(),
    };
    mockAccountEntriesService = {
      entries: signal([
        {
          id: '1',
          userId: 'user1',
          name: 'BDO',
          type: 'cash',
          createdAt: '2026-10-28',
          updatedAt: '2026-10-28',
        },
        {
          id: '2',
          userId: 'user1',
          name: 'GCash',
          type: 'cash',
          createdAt: '2026-10-28',
          updatedAt: '2026-10-28',
        },
      ]),
    };
    mockEntryRecordsService = {
      upsertAmount: vi.fn().mockResolvedValue({}),
      getRecords: vi.fn().mockResolvedValue([
        {
          id: 'rec1',
          userId: 'user1',
          accountEntryId: '1',
          day: '2026-10-28',
          balance: 1500,
          accountName: 'BDO',
          accountType: 'cash',
          recordedDate: '2026-10-28T00:00:00.000Z',
          createdAt: '2026-10-28',
          updatedAt: '2026-10-28',
        },
      ]),
      deleteBalance: vi.fn().mockResolvedValue({}),
    };

    await TestBed.configureTestingModule({
      imports: [CreateEntryDialog],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: AccountEntriesService, useValue: mockAccountEntriesService },
        { provide: EntryRecordsService, useValue: mockEntryRecordsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateEntryDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Always restore real timers, even if a test fails halfway through.
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display inputs for each entry from AccountEntriesService', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const formFields = compiled.querySelectorAll('mat-form-field');
    // 2 account entries + 1 date picker field
    expect(formFields.length).toBe(3);
  });

  describe('closing', () => {
    it('should close the dialog when the close button is clicked', async () => {
      const closeBtn = fixture.nativeElement.querySelector(
        '.dialog-header button',
      ) as HTMLButtonElement | null;
      // Fail loudly if the selector is wrong, instead of silently clicking nothing.
      expect(closeBtn).not.toBeNull();

      closeBtn!.click();

      // close() is async (it flushes pending saves first), so wait for it.
      await vi.waitFor(() => expect(mockDialogRef.close).toHaveBeenCalledTimes(1));
    });

    it('should save pending edits immediately before closing', async () => {
      component['onBalanceInput']('1', 2500);
      expect(mockEntryRecordsService.upsertAmount).not.toHaveBeenCalled();

      await component['close']();

      expect(mockEntryRecordsService.upsertAmount).toHaveBeenCalledWith(
        expect.objectContaining({ accountEntryId: '1', balance: 2500 }),
      );
      expect(mockDialogRef.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('saving balances', () => {
    it('should call upsertAmount with a debounce of 0.5s when the user types', () => {
      vi.useFakeTimers();

      component['onBalanceInput']('1', 2500);
      expect(mockEntryRecordsService.upsertAmount).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);
      expect(mockEntryRecordsService.upsertAmount).toHaveBeenCalledTimes(1);
      expect(mockEntryRecordsService.upsertAmount).toHaveBeenCalledWith(
        expect.objectContaining({
          accountEntryId: '1',
          balance: 2500,
        }),
      );
    });

    it('should only save the latest value when the user types repeatedly', () => {
      vi.useFakeTimers();

      component['onBalanceInput']('1', 100);
      vi.advanceTimersByTime(300);
      component['onBalanceInput']('1', 200);
      vi.advanceTimersByTime(500);

      expect(mockEntryRecordsService.upsertAmount).toHaveBeenCalledTimes(1);
      expect(mockEntryRecordsService.upsertAmount).toHaveBeenCalledWith(
        expect.objectContaining({ accountEntryId: '1', balance: 200 }),
      );
    });

    it('should delete the record when a balance is cleared', () => {
      vi.useFakeTimers();

      component['onBalanceInput']('1', null);
      vi.advanceTimersByTime(500);

      expect(mockEntryRecordsService.deleteBalance).toHaveBeenCalledWith(
        expect.objectContaining({ accountEntryId: '1' }),
      );
      expect(mockEntryRecordsService.upsertAmount).not.toHaveBeenCalled();
    });

    it('should show an error snackbar when saving fails', async () => {
      vi.useFakeTimers();
      const openSpy = vi
        .spyOn(TestBed.inject(MatSnackBar), 'open')
        .mockImplementation(() => ({}) as never);
      mockEntryRecordsService.upsertAmount.mockRejectedValueOnce(new Error('boom'));

      component['onBalanceInput']('1', 2500);
      // Async variant also flushes the promise microtasks.
      await vi.advanceTimersByTimeAsync(500);

      expect(openSpy).toHaveBeenCalledWith('Failed to save balance.', 'Close', {
        duration: 5000,
      });
    });
  });

  describe('loading records', () => {
    it('should fetch records and populate balances on init', async () => {
      await fixture.whenStable();

      expect(mockEntryRecordsService.getRecords).toHaveBeenCalledTimes(1);
      expect(component['balances']()['1']).toBe(1500);
    });

    it('should refetch records and reset balances when the date changes', async () => {
      await fixture.whenStable();
      expect(component['balances']()['1']).toBe(1500);

      mockEntryRecordsService.getRecords.mockResolvedValueOnce([
        {
          id: 'rec2',
          userId: 'user1',
          accountEntryId: '2',
          day: '2025-06-15',
          balance: 3000,
          accountName: 'GCash',
          accountType: 'cash',
          recordedDate: '2025-06-15T00:00:00.000Z',
          createdAt: '2025-06-15',
          updatedAt: '2025-06-15',
        },
      ]);

      // The form starts on today's date, so pick a fixed date that can never
      // match it. Use the local-time constructor (not an ISO string) so the
      // result doesn't shift with the machine's timezone.
      component['entryForm'].controls.date.setValue(new Date(2025, 5, 15));
      // The resource reloads inside an effect, which only runs during change detection.
      fixture.detectChanges();

      await vi.waitFor(() => expect(component['balances']()['2']).toBe(3000));

      expect(mockEntryRecordsService.getRecords).toHaveBeenCalledTimes(2);
      expect(mockEntryRecordsService.getRecords).toHaveBeenLastCalledWith({
        date: '2025-06-15',
      });
      // Balances from the previous day must be gone.
      expect(component['balances']()['1']).toBeUndefined();
    });
  });
});