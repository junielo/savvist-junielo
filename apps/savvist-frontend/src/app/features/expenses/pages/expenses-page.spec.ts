import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpensesPage } from './expenses-page';

describe('ExpensesPage', () => {
  let component: ExpensesPage;
  let fixture: ComponentFixture<ExpensesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpensesPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpensesPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
