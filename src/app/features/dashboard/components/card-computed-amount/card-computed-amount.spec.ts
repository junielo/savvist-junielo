import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardComputedAmount } from './card-computed-amount';

describe('CardComputedAmount', () => {
  let component: CardComputedAmount;
  let fixture: ComponentFixture<CardComputedAmount>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardComputedAmount],
    }).compileComponents();

    fixture = TestBed.createComponent(CardComputedAmount);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
