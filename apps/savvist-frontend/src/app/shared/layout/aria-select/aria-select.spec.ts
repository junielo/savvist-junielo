import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AriaSelect } from './aria-select';
import { Component, signal } from '@angular/core';

@Component({
  imports: [AriaSelect],
  template: `
    <app-aria-select
      [options]="options"
      [placeholder]="placeholder"
      [(value)]="value"
      [disabled]="disabled"
      [width]="width"
    />
  `,
})
class TestHostComponent {
  options = ['Option 1', 'Option 2'];
  placeholder = 'Select option';
  value = signal('');
  disabled = false;
  width = '250px';
}

describe('AriaSelect', () => {
  let component: AriaSelect;
  let fixture: ComponentFixture<AriaSelect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AriaSelect, TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AriaSelect);
    component = fixture.componentInstance;
    // Provide required options input
    fixture.componentRef.setInput('options', ['A', 'B']);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept optional width input', async () => {
    const hostFixture = TestBed.createComponent(TestHostComponent);
    hostFixture.detectChanges();
    await hostFixture.whenStable();

    const selectEl = hostFixture.nativeElement.querySelector('.select');
    expect(selectEl.style.width).toBe('250px');
  });

  it('should default width to undefined when not provided', async () => {
    expect(component.width()).toBeUndefined();
  });
});
