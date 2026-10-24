import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpenseDialog } from './expense-dialog';

describe('ExpenseDialog', () => {
  let component: ExpenseDialog;
  let fixture: ComponentFixture<ExpenseDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpenseDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
