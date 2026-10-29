import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ExpensesPage } from './expenses-page';
import { ExpenseService } from '../services/expense.service';

describe('ExpensesPage', () => {
  let component: ExpensesPage;
  let fixture: ComponentFixture<ExpensesPage>;
  let mockExpenseService: {
    expenses: ReturnType<typeof signal>;
    isLoading: ReturnType<typeof signal>;
  };

  beforeEach(async () => {
    mockExpenseService = {
      expenses: signal([]),
      isLoading: signal(false),
    };

    await TestBed.configureTestingModule({
      imports: [ExpensesPage],
      providers: [
        { provide: ExpenseService, useValue: mockExpenseService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpensesPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
