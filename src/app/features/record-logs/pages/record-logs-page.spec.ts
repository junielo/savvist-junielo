import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecordLogsPage } from './record-logs-page';

describe('RecordLogsPage', () => {
  let component: RecordLogsPage;
  let fixture: ComponentFixture<RecordLogsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecordLogsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(RecordLogsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
