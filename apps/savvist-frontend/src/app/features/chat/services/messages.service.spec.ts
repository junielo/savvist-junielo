import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MessagesService } from './messages.service';

describe('MessagesService', () => {
  let service: MessagesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MessagesService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(MessagesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch messages for a conversation', async () => {
    const promise = service.findAll('conv1');

    const req = httpMock.expectOne('/api/conversations/conv1/messages');
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        _id: 'msg1',
        conversationId: 'conv1',
        userId: 'user1',
        role: 'user',
        content: 'Hello',
        status: 'complete',
      },
    ]);

    const result = await promise;
    expect(result).toEqual([
      {
        id: 'msg1',
        role: 'user',
        content: 'Hello',
        status: 'complete',
      },
    ]);
  });

  it('should send a message and return user and assistant messages', async () => {
    const promise = service.send('conv1', 'How much did I spend?');

    const req = httpMock.expectOne('/api/conversations/conv1/messages/send');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ content: 'How much did I spend?' });

    req.flush({
      userMessage: {
        _id: 'msg1',
        conversationId: 'conv1',
        userId: 'user1',
        role: 'user',
        content: 'How much did I spend?',
        status: 'complete',
      },
      assistantMessage: {
        _id: 'msg2',
        conversationId: 'conv1',
        userId: 'user1',
        role: 'assistant',
        content: 'You spent $100.',
        status: 'complete',
      },
    });

    const result = await promise;
    expect(result.userMessage.id).toBe('msg1');
    expect(result.assistantMessage.content).toBe('You spent $100.');
  });

  it('should create a manual message', async () => {
    const promise = service.create('conv1', {
      role: 'user',
      content: 'Test message',
      status: 'complete',
    });

    const req = httpMock.expectOne('/api/conversations/conv1/messages');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      role: 'user',
      content: 'Test message',
      status: 'complete',
    });

    req.flush({
      _id: 'msg3',
      conversationId: 'conv1',
      userId: 'user1',
      role: 'user',
      content: 'Test message',
      status: 'complete',
    });

    const result = await promise;
    expect(result).toEqual({
      id: 'msg3',
      role: 'user',
      content: 'Test message',
      status: 'complete',
    });
  });
});
