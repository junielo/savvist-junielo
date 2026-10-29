import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EntryRecordsService } from './entry-records.service';

describe('EntryRecordsService', () => {
  let service: EntryRecordsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EntryRecordsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(EntryRecordsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch records by date query', async () => {
    const promise = service.getRecords({ date: '2026-10-28' });

    const req = httpMock.expectOne('/api/entry-records?date=2026-10-28');
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        _id: '1',
        userId: 'user1',
        accountEntryId: 'acc1',
        day: '2026-10-28',
        balance: 1000,
        accountName: 'BDO',
        accountType: 'cash',
        recordedDate: '2026-10-28T00:00:00.000Z',
        createdAt: '2026-10-28',
        updatedAt: '2026-10-28',
      },
    ]);

    const records = await promise;
    expect(records).toEqual([
      {
        id: '1',
        userId: 'user1',
        accountEntryId: 'acc1',
        day: '2026-10-28',
        balance: 1000,
        accountName: 'BDO',
        accountType: 'cash',
        recordedDate: '2026-10-28T00:00:00.000Z',
        createdAt: '2026-10-28',
        updatedAt: '2026-10-28',
      },
    ]);
  });

  it('should update balance', async () => {
    const promise = service.updateBalance({
      accountEntryId: 'acc1',
      day: '2026-10-28',
      balance: 1500,
    });

    const req = httpMock.expectOne('/api/entry-records');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      accountEntryId: 'acc1',
      day: '2026-10-28',
      balance: 1500,
    });

    req.flush({
      _id: '1',
      userId: 'user1',
      accountEntryId: 'acc1',
      day: '2026-10-28',
      balance: 1500,
      accountName: 'BDO',
      accountType: 'cash',
      recordedDate: '2026-10-28T00:00:00.000Z',
      createdAt: '2026-10-28',
      updatedAt: '2026-10-28',
    });

    const record = await promise;
    expect(record.balance).toBe(1500);
    expect(record.id).toBe('1');
  });

  it('should upsert amount', async () => {
    const promise = service.upsertAmount({
      accountEntryId: 'acc1',
      day: '2026-10-28',
      balance: 2000,
    });

    const req = httpMock.expectOne('/api/entry-records/upsert');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      accountEntryId: 'acc1',
      day: '2026-10-28',
      balance: 2000,
    });

    req.flush({
      _id: '1',
      userId: 'user1',
      accountEntryId: 'acc1',
      day: '2026-10-28',
      balance: 2000,
      accountName: 'BDO',
      accountType: 'cash',
      recordedDate: '2026-10-28T00:00:00.000Z',
      createdAt: '2026-10-28',
      updatedAt: '2026-10-28',
    });

    const record = await promise;
    expect(record.balance).toBe(2000);
    expect(record.id).toBe('1');
  });

  it('should delete balance by id', async () => {
    const promise = service.deleteBalanceById('1');

    const req = httpMock.expectOne('/api/entry-records/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ deleted: true, _id: '1' });

    const result = await promise;
    expect(result).toEqual({ deleted: true, id: '1' });
  });

  it('should delete balance by query', async () => {
    const promise = service.deleteBalance({ accountEntryId: 'acc1', day: '2026-10-28' });

    const req = httpMock.expectOne('/api/entry-records?accountEntryId=acc1&day=2026-10-28');
    expect(req.request.method).toBe('DELETE');
    req.flush({ deleted: true, _id: '1' });

    const result = await promise;
    expect(result).toEqual({ deleted: true, id: '1' });
  });
});
