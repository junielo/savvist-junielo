import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApexGaugeLabel } from './apex-gauge-label';

describe('ApexGaugeLabel', () => {
  let component: ApexGaugeLabel;
  let fixture: ComponentFixture<ApexGaugeLabel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApexGaugeLabel],
    }).compileComponents();

    fixture = TestBed.createComponent(ApexGaugeLabel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute chart series from value input', () => {
    fixture.componentRef.setInput('value', 75);
    expect(component['chartSeries']()).toEqual([75]);
  });
});
