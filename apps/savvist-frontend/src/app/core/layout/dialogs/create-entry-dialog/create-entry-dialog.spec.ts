import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateEntryDialog } from './create-entry-dialog';
import { AccountEntriesService } from '../../../services/account-entries.service';

describe('CreateEntryDialog', () => {
  let component: CreateEntryDialog;
  let fixture: ComponentFixture<CreateEntryDialog>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockAccountEntriesService: { entries: ReturnType<typeof signal> };

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

    await TestBed.configureTestingModule({
      imports: [CreateEntryDialog],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: AccountEntriesService, useValue: mockAccountEntriesService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateEntryDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display inputs for each entry from AccountEntriesService', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const formFields = compiled.querySelectorAll('mat-form-field');
    expect(formFields.length).toBe(3);
  });

  it('should close dialog when close button is clicked', () => {
    const closeSpy = vi.spyOn(mockDialogRef, 'close');
    const closeBtn = fixture.nativeElement.querySelector('button[matIconButton], button[aria-label="Close dialog"]');
    closeBtn?.click();
    expect(closeSpy).toHaveBeenCalled();
  });
});
