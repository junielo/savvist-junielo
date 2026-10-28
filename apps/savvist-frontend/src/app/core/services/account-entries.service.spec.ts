import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AccountEntriesService } from './account-entries.service';
import { effect, Injector, runInInjectionContext } from '@angular/core';

describe('AccountEntriesService', () => {
  let service: AccountEntriesService;
  let httpMock: HttpTestingController;
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AccountEntriesService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AccountEntriesService);
    httpMock = TestBed.inject(HttpTestingController);
    injector = TestBed.inject(Injector);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch entries', async () => {
    runInInjectionContext(injector, () => {
      effect(() => {
        service.entries();
      });
    });

    TestBed.flushEffects();

    const req = httpMock.expectOne('/api/account-entries');
    expect(req.request.method).toBe('GET');
    req.flush([
      { _id: '1', userId: 'user1', name: 'BDO', type: 'cash', createdAt: '2026-10-28', updatedAt: '2026-10-28' },
    ]);

    await new Promise((resolve) => setTimeout(resolve, 0));
    TestBed.flushEffects();

    expect(service.entries()).toEqual([
      { id: '1', userId: 'user1', name: 'BDO', type: 'cash', createdAt: '2026-10-28', updatedAt: '2026-10-28' },
    ]);
  });
});
