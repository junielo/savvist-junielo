import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ExpenseService } from './expense.service';
import { effect, Injector, runInInjectionContext } from '@angular/core';

describe('ExpenseService', () => {
  let service: ExpenseService;
  let httpMock: HttpTestingController;
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ExpenseService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ExpenseService);
    httpMock = TestBed.inject(HttpTestingController);
    injector = TestBed.inject(Injector);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch expenses', async () => {
    runInInjectionContext(injector, () => {
      effect(() => {
        service.expenses();
      });
    });

    TestBed.flushEffects();

    const req = httpMock.expectOne('/api/expenses');
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        _id: '1',
        userId: 'user1',
        name: 'Internet',
        amount: 1500,
        dayOfMonth: 21,
        months: [],
      },
    ]);

    await new Promise((resolve) => setTimeout(resolve, 0));
    TestBed.flushEffects();

    expect(service.expenses()).toEqual([
      {
        id: '1',
        userId: 'user1',
        name: 'Internet',
        amount: 1500,
        dayOfMonth: 21,
        months: [],
      },
    ]);
  });

  it('should create an expense', async () => {
    const promise = service.create({
      name: 'Insurance',
      amount: 5000,
      dayOfMonth: 5,
      months: [1, 12],
    });

    const req = httpMock.expectOne('/api/expenses');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Insurance',
      amount: 5000,
      dayOfMonth: 5,
      months: [1, 12],
    });

    req.flush({
      _id: '2',
      userId: 'user1',
      name: 'Insurance',
      amount: 5000,
      dayOfMonth: 5,
      months: [1, 12],
    });

    const result = await promise;
    expect(result).toEqual({
      id: '2',
      userId: 'user1',
      name: 'Insurance',
      amount: 5000,
      dayOfMonth: 5,
      months: [1, 12],
    });
  });

  it('should update an expense', async () => {
    const promise = service.update('1', { amount: 1600 });

    const req = httpMock.expectOne('/api/expenses/1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ amount: 1600 });

    req.flush({
      _id: '1',
      userId: 'user1',
      name: 'Internet',
      amount: 1600,
      dayOfMonth: 21,
      months: [],
    });

    const result = await promise;
    expect(result.amount).toBe(1600);
  });

  it('should remove an expense', async () => {
    const promise = service.remove('1');

    const req = httpMock.expectOne('/api/expenses/1');
    expect(req.request.method).toBe('DELETE');

    req.flush({});
    await promise;
  });
});
