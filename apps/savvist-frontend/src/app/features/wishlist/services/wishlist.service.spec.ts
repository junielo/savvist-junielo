import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WishlistService } from './wishlist.service';
import { effect, Injector, runInInjectionContext } from '@angular/core';

describe('WishlistService', () => {
  let service: WishlistService;
  let httpMock: HttpTestingController;
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WishlistService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(WishlistService);
    httpMock = TestBed.inject(HttpTestingController);
    injector = TestBed.inject(Injector);

    const wishlistReqs = httpMock.match('/api/wishlist');
    wishlistReqs.forEach((req) => req.flush([]));
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch wishlist items', async () => {
    runInInjectionContext(injector, () => {
      effect(() => {
        service.wishlist();
      });
    });

    TestBed.flushEffects();

    const req = httpMock.expectOne('/api/wishlist');
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        _id: '1',
        userId: 'user1',
        name: 'Mechanical Keyboard',
        amount: 4500,
        priority: 'important',
        status: 'pending',
      },
    ]);

    await new Promise((resolve) => setTimeout(resolve, 0));
    TestBed.flushEffects();

    expect(service.wishlist()).toEqual([
      {
        id: '1',
        userId: 'user1',
        name: 'Mechanical Keyboard',
        amount: 4500,
        type: 'Important',
        isCompleted: false,
        priority: 'important',
        status: 'pending',
        purchasedAt: undefined,
      },
    ]);
  });

  it('should create a wishlist item', async () => {
    const promise = service.create({
      name: 'Monitor',
      amount: 12000,
      type: 'Normal',
    });

    const req = httpMock.expectOne('/api/wishlist');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Monitor',
      amount: 12000,
      type: 'Normal',
      priority: 'normal',
    });

    req.flush({
      _id: '2',
      userId: 'user1',
      name: 'Monitor',
      amount: 12000,
      priority: 'normal',
      status: 'pending',
    });

    const result = await promise;
    expect(result.id).toBe('2');
    expect(result.name).toBe('Monitor');
    expect(result.type).toBe('Normal');
  });

  it('should update a wishlist item', async () => {
    const promise = service.update('1', { amount: 5000 });

    const req = httpMock.expectOne('/api/wishlist/1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ amount: 5000, priority: undefined });

    req.flush({
      _id: '1',
      userId: 'user1',
      name: 'Mechanical Keyboard',
      amount: 5000,
      priority: 'important',
      status: 'pending',
    });

    const result = await promise;
    expect(result.amount).toBe(5000);
  });

  it('should update wishlist item type', async () => {
    const promise = service.updateType('1', 'ASAP');

    const req = httpMock.expectOne('/api/wishlist/1/type');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ priority: 'asap', type: 'ASAP' });

    req.flush({
      _id: '1',
      userId: 'user1',
      name: 'Mechanical Keyboard',
      amount: 4500,
      priority: 'asap',
      status: 'pending',
    });

    const result = await promise;
    expect(result.type).toBe('ASAP');
    expect(result.priority).toBe('asap');
  });

  it('should purchase wishlist item', async () => {
    const promise = service.purchase('1');

    const req = httpMock.expectOne('/api/wishlist/1/purchase');
    expect(req.request.method).toBe('POST');

    req.flush({
      _id: '1',
      userId: 'user1',
      name: 'Mechanical Keyboard',
      amount: 4500,
      priority: 'important',
      status: 'purchased',
      purchasedAt: new Date().toISOString(),
    });

    const result = await promise;
    expect(result.isCompleted).toBe(true);
    expect(result.status).toBe('purchased');
  });

  it('should undo purchase wishlist item', async () => {
    const promise = service.undoPurchase('1');

    const req = httpMock.expectOne('/api/wishlist/1/undo-purchase');
    expect(req.request.method).toBe('POST');

    req.flush({
      _id: '1',
      userId: 'user1',
      name: 'Mechanical Keyboard',
      amount: 4500,
      priority: 'important',
      status: 'pending',
      purchasedAt: null,
    });

    const result = await promise;
    expect(result.isCompleted).toBe(false);
    expect(result.status).toBe('pending');
  });

  it('should remove a wishlist item', async () => {
    const promise = service.remove('1');

    const req = httpMock.expectOne('/api/wishlist/1');
    expect(req.request.method).toBe('DELETE');

    req.flush({});
    await promise;
  });
});
