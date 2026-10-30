import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ExpensesPage } from './expenses-page';
import { ExpenseService } from '../services/expense.service';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';

describe('ExpensesPage', () => {
  let component: ExpensesPage;
  let fixture: ComponentFixture<ExpensesPage>;
  let mockExpenseService: {
    expenses: ReturnType<typeof signal>;
    isLoading: ReturnType<typeof signal>;
    remove: ReturnType<typeof vi.fn>;
  };
  let mockMatDialog: {
    open: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockExpenseService = {
      expenses: signal([]),
      isLoading: signal(false),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    mockMatDialog = {
      open: vi.fn().mockReturnValue({
        afterClosed: () => of(true),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [ExpensesPage],
      providers: [
        { provide: ExpenseService, useValue: mockExpenseService },
        { provide: MatDialog, useValue: mockMatDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpensesPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should prompt confirmation and remove expense when confirmed', async () => {
    await component['deleteExpense']('123');
    expect(mockMatDialog.open).toHaveBeenCalled();
    expect(mockExpenseService.remove).toHaveBeenCalledWith('123');
    expect(component['errorMessage']()).toBeNull();
  });

  it('should not remove expense when confirmation is cancelled', async () => {
    mockMatDialog.open.mockReturnValueOnce({
      afterClosed: () => of(false),
    });

    await component['deleteExpense']('123');
    expect(mockExpenseService.remove).not.toHaveBeenCalled();
  });

  it('should handle ApiError and set errorMessage when deletion fails', async () => {
    const apiError = new ApiError(400, ['Failed to delete expense']);
    mockExpenseService.remove.mockRejectedValueOnce(apiError);

    await component['deleteExpense']('123');
    expect(component['errorMessage']()).toBe('Failed to delete expense');
  });

  it('should handle generic error and set default errorMessage when deletion fails', async () => {
    mockExpenseService.remove.mockRejectedValueOnce(new Error('Network error'));

    await component['deleteExpense']('123');
    expect(component['errorMessage']()).toBe('Failed to delete expense.');
  });
});
