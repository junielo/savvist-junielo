import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApexLineChart } from './apex-line-chart';

describe('ApexLineChart', () => {
  let component: ApexLineChart;
  let fixture: ComponentFixture<ApexLineChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApexLineChart],
    }).compileComponents();

    fixture = TestBed.createComponent(ApexLineChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
