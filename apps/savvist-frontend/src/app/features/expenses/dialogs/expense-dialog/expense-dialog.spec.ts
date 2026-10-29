import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ExpenseDialog } from './expense-dialog';
import { ExpenseService } from '../../services/expense.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';

describe('ExpenseDialog', () => {
  let component: ExpenseDialog;
  let fixture: ComponentFixture<ExpenseDialog>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ExpenseDialog],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: null },
        ExpenseService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpenseDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form controls', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const nameInput = compiled.querySelector('input[formControlName="name"]');
    const amountInput = compiled.querySelector('input[formControlName="amount"]');

    expect(nameInput).toBeTruthy();
    expect(amountInput).toBeTruthy();
  });

  it('should render month chips', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const chips = compiled.querySelectorAll('mat-chip-option');
    expect(chips.length).toBe(12);
  });

  it('should close dialog on close()', () => {
    component['close']();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });
});
