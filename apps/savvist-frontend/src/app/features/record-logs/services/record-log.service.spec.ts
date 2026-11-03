import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RecordLogService } from './record-log.service';
import { effect, Injector, runInInjectionContext } from '@angular/core';

describe('RecordLogService', () => {
  let service: RecordLogService;
  let httpMock: HttpTestingController;
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RecordLogService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(RecordLogService);
    httpMock = TestBed.inject(HttpTestingController);
    injector = TestBed.inject(Injector);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch record logs', async () => {
    runInInjectionContext(injector, () => {
      effect(() => {
        service.recordLogs();
      });
    });

    TestBed.flushEffects();

    const req = httpMock.expectOne('/api/record-logs');
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        _id: '1',
        userId: 'user1',
        name: 'Rent',
        amount: 8500,
        recordType: 'expense',
        action: 'created',
        date: '2026-10-01T00:00:00.000Z',
        sourceCollection: 'expenses',
        sourceId: '123',
      },
    ]);

    await new Promise((resolve) => setTimeout(resolve, 0));
    TestBed.flushEffects();

    expect(service.recordLogs()).toHaveLength(1);
    expect(service.recordLogs()[0].name).toBe('Rent');
    expect(service.recordLogs()[0].recordType).toBe('Expense');
  });
});
