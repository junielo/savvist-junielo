import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpenseListItem } from './expense-list-item';

describe('ExpenseListItem', () => {
  let component: ExpenseListItem;
  let fixture: ComponentFixture<ExpenseListItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseListItem],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpenseListItem);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('itemData', {
      id: '1',
      userId: 'user1',
      name: 'Coffee',
      amount: 150,
      dayOfMonth: 15,
      hasSelMonths: false,
    });
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
