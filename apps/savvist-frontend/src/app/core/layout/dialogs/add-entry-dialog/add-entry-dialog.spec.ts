import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AddEntryDialog } from './add-entry-dialog';
import { AccountEntriesService } from '../../../services/account-entries.service';
import { ApiError } from '../../../http/api-error';

describe('AddEntryDialog', () => {
  let component: AddEntryDialog;
  let fixture: ComponentFixture<AddEntryDialog>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockAccountEntriesService: { createEntry: ReturnType<typeof vi.fn> };
  let mockSnackBar: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };
    mockAccountEntriesService = {
      createEntry: vi.fn().mockResolvedValue({
        id: '123',
        userId: 'user1',
        name: 'BDO Savings',
        type: 'cash',
        createdAt: '2026-10-28',
        updatedAt: '2026-10-28',
      }),
    };
    mockSnackBar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [AddEntryDialog],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: AccountEntriesService, useValue: mockAccountEntriesService },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddEntryDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog on close()', () => {
    component['close']();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should call AccountEntriesService.createEntry and close dialog on successful save()', async () => {
    component['value'].set('BDO Savings');

    await component['save']();

    expect(mockAccountEntriesService.createEntry).toHaveBeenCalledWith('BDO Savings', 'cash');
    expect(mockDialogRef.close).toHaveBeenCalledWith({
      id: '123',
      userId: 'user1',
      name: 'BDO Savings',
      type: 'cash',
      createdAt: '2026-10-28',
      updatedAt: '2026-10-28',
    });
  });

  it('should show snackbar and set error message when createEntry fails', async () => {
    component['value'].set('BDO Savings');
    const apiError = new ApiError(400, ['Account name already exists']);
    mockAccountEntriesService.createEntry.mockRejectedValue(apiError);

    await component['save']();

    expect(mockAccountEntriesService.createEntry).toHaveBeenCalledWith('BDO Savings', 'cash');
    expect(component['errorMessage']()).toBe('Account name already exists');
    expect(mockSnackBar.open).toHaveBeenCalledWith('Account name already exists', 'Close', {
      duration: 5000,
    });
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });
});
