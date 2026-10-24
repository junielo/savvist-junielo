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
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
