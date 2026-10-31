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

  it('should format amount with decimal and render subText', async () => {
    fixture.componentRef.setInput('amount', 12345.6);
    fixture.componentRef.setInput('subText', 'Total Monthly Revenue 2026');
    fixture.componentRef.setInput('height', '350px');
    fixture.componentRef.setInput('backgroundColor', '#f5f5f5');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const amountEl = compiled.querySelector('.huge-amount');
    const subTextEl = compiled.querySelector('.sub-text');
    const cardEl = compiled.querySelector('.computed-amount-card') as HTMLElement;

    expect(amountEl?.textContent?.trim()).toContain('12,345.60');
    expect(subTextEl?.textContent?.trim()).toBe('Total Monthly Revenue 2026');
    expect(cardEl.style.height).toBe('350px');
    expect(cardEl.style.backgroundColor).toBe('rgb(245, 245, 245)');
  });
});
