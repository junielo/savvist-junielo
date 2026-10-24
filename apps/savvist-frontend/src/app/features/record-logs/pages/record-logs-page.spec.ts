import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('RecordLogsPage', () => {
  let component: any;
  let fixture: ComponentFixture<any>;
  let RecordLogsPage: any;

  beforeEach(async () => {
    if (typeof globalThis.ResizeObserver === 'undefined') {
      globalThis.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as any;
      if (typeof window !== 'undefined') {
        (window as any).ResizeObserver = globalThis.ResizeObserver;
      }
    }

    const mod = await import('./record-logs-page');
    RecordLogsPage = mod.RecordLogsPage;

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
