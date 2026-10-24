import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApexTableData } from './apex-table-data';

describe('ApexTableData', () => {
  let component: ApexTableData;
  let fixture: ComponentFixture<ApexTableData>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApexTableData],
    }).compileComponents();

    fixture = TestBed.createComponent(ApexTableData);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
