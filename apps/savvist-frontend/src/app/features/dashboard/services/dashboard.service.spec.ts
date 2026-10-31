import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';
import { effect, Injector, runInInjectionContext } from '@angular/core';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
    injector = TestBed.inject(Injector);

    const summaryReqs = httpMock.match('/api/dashboard/summary');
    summaryReqs.forEach((req) => req.flush(null));
    const trendReqs = httpMock.match('/api/dashboard/trend');
    trendReqs.forEach((req) => req.flush([]));
  });

  afterEach(() => {
    const pending = httpMock.match(() => true);
    pending.forEach((req) => req.flush(null));
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch dashboard summary / latest metric', async () => {
    runInInjectionContext(injector, () => {
      effect(() => {
        service.summary();
      });
    });

    TestBed.flushEffects();

    const req = httpMock.expectOne('/api/dashboard/summary');
    expect(req.request.method).toBe('GET');
    req.flush({
      _id: 'metric1',
      userId: 'user1',
      day: '2026-10-31',
      totalFund: 50000,
      actualCash: 25000,
      health: 0.8,
      growth: 0.15,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    TestBed.flushEffects();

    expect(service.summary()?.id).toBe('metric1');
    expect(service.summary()?.totalFund).toBe(50000);
  });

  it('should fetch trend metrics', async () => {
    runInInjectionContext(injector, () => {
      effect(() => {
        service.trend();
      });
    });

    TestBed.flushEffects();

    const req = httpMock.expectOne('/api/dashboard/trend');
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        _id: 'metric1',
        userId: 'user1',
        day: '2026-10-31',
        totalFund: 50000,
        actualCash: 25000,
        health: 0.8,
        growth: 0.15,
      },
    ]);

    await new Promise((resolve) => setTimeout(resolve, 0));
    TestBed.flushEffects();

    expect(service.trend().length).toBe(1);
    expect(service.trend()[0].totalFund).toBe(50000);
  });

  it('should compute and save for day', async () => {
    const promise = service.computeAndSaveForDay('2026-10-31');

    const req = httpMock.expectOne('/api/daily-metrics/compute');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ day: '2026-10-31' });

    req.flush({
      _id: 'metric1',
      userId: 'user1',
      day: '2026-10-31',
      totalFund: 50000,
      actualCash: 25000,
      health: 0.8,
      growth: 0.15,
    });

    const result = await promise;
    expect(result.id).toBe('metric1');
    expect(result.day).toBe('2026-10-31');
  });

  it('should get trend with limit via getTrend()', async () => {
    const promise = service.getTrend(10);

    const req = httpMock.expectOne('/api/dashboard/trend?limit=10');
    expect(req.request.method).toBe('GET');

    req.flush([
      {
        _id: 'metric1',
        userId: 'user1',
        day: '2026-10-31',
        totalFund: 50000,
        actualCash: 25000,
        health: 0.8,
        growth: 0.15,
      },
    ]);

    const result = await promise;
    expect(result.length).toBe(1);
  });
});
