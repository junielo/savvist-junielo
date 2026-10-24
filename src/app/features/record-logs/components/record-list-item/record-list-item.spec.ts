import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecordListItem } from './record-list-item';

describe('RecordListItem', () => {
  let component: RecordListItem;
  let fixture: ComponentFixture<RecordListItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecordListItem],
    }).compileComponents();

    fixture = TestBed.createComponent(RecordListItem);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
