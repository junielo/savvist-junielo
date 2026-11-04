import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConversationsService } from './conversations.service';
import { effect, Injector, runInInjectionContext } from '@angular/core';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let httpMock: HttpTestingController;
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ConversationsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ConversationsService);
    httpMock = TestBed.inject(HttpTestingController);
    injector = TestBed.inject(Injector);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch conversations via httpResource', async () => {
    runInInjectionContext(injector, () => {
      effect(() => {
        service.conversations();
      });
    });

    TestBed.flushEffects();

    const req = httpMock.expectOne('/api/conversations');
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        _id: 'conv1',
        userId: 'user1',
        title: 'Test Chat',
        lastMessageAt: new Date().toISOString(),
      },
    ]);

    await new Promise((resolve) => setTimeout(resolve, 0));
    TestBed.flushEffects();

    expect(service.conversations()).toEqual([
      {
        id: 'conv1',
        title: 'Test Chat',
      },
    ]);
  });

  it('should create a conversation', async () => {
    const promise = service.create({ title: 'New chat' });

    const req = httpMock.expectOne('/api/conversations');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'New chat' });

    req.flush({
      _id: 'conv2',
      userId: 'user1',
      title: 'New chat',
    });

    const result = await promise;
    expect(result).toEqual({
      id: 'conv2',
      title: 'New chat',
    });
  });

  it('should update a conversation', async () => {
    const promise = service.update('conv1', { title: 'Updated Title' });

    const req = httpMock.expectOne('/api/conversations/conv1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ title: 'Updated Title' });

    req.flush({
      _id: 'conv1',
      userId: 'user1',
      title: 'Updated Title',
    });

    const result = await promise;
    expect(result.title).toBe('Updated Title');
  });

  it('should remove a conversation', async () => {
    const promise = service.remove('conv1');

    const req = httpMock.expectOne('/api/conversations/conv1');
    expect(req.request.method).toBe('DELETE');

    req.flush({ deleted: true, _id: 'conv1' });
    await promise;
  });
});
