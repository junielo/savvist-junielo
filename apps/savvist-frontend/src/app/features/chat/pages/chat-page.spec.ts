import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { ChatPage } from './chat-page';
import { ConversationsService } from '../services/conversations.service';
import { MessagesService } from '../services/messages.service';

describe('ChatPage', () => {
  let component: ChatPage;
  let fixture: ComponentFixture<ChatPage>;
  let mockMatDialog: { open: ReturnType<typeof vi.fn> };
  let mockConversationsService: {
    conversations: ReturnType<typeof signal>;
    isLoading: ReturnType<typeof signal>;
    reload: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let mockMessagesService: {
    findAll: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockMatDialog = {
      open: vi.fn().mockReturnValue({
        afterClosed: () => of(true),
      }),
    };

    mockConversationsService = {
      conversations: signal([
        { id: 'conv1', title: 'Test Chat 1' },
        { id: 'conv2', title: 'Test Chat 2' },
      ]),
      isLoading: signal(false),
      reload: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: 'conv3', title: 'New chat' }),
      update: vi.fn().mockResolvedValue({ id: 'conv1', title: 'Updated Title' }),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    mockMessagesService = {
      findAll: vi.fn().mockResolvedValue([
        { id: 'msg1', role: 'user', content: 'Hello', status: 'complete' },
      ]),
      send: vi.fn().mockResolvedValue({
        userMessage: { id: 'msg2', role: 'user', content: 'Hi', status: 'complete' },
        assistantMessage: { id: 'msg3', role: 'assistant', content: 'Hello there!', status: 'complete' },
      }),
    };

    await TestBed.configureTestingModule({
      imports: [ChatPage],
      providers: [
        { provide: MatDialog, useValue: mockMatDialog },
        { provide: ConversationsService, useValue: mockConversationsService },
        { provide: MessagesService, useValue: mockMessagesService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should select the first session on load and fetch messages', () => {
    expect(component.activeId()).toBe('conv1');
    expect(mockMessagesService.findAll).toHaveBeenCalledWith('conv1');
  });

  it('should switch sessions and fetch messages if not cached', async () => {
    component['onSelectSession']('conv2');
    expect(component.activeId()).toBe('conv2');
    expect(mockMessagesService.findAll).toHaveBeenCalledWith('conv2');
  });

  it('should create a new session', async () => {
    await component['onCreateSession']();
    expect(mockConversationsService.create).toHaveBeenCalled();
    expect(component.activeId()).toBe('conv3');
  });

  it('should rename an existing session', async () => {
    await component['onRenameSession']({ id: 'conv1', title: 'Updated Title' });
    expect(mockConversationsService.update).toHaveBeenCalledWith('conv1', { title: 'Updated Title' });
  });

  it('should delete a session', async () => {
    component.activeId.set('conv1');
    await component['onRemoveSession']('conv1');
    expect(mockConversationsService.remove).toHaveBeenCalledWith('conv1');
  });

  it('should send a message and append user and assistant messages', async () => {
    component.activeId.set('conv1');
    await component['onSendMessage']('Hi');
    expect(mockMessagesService.send).toHaveBeenCalledWith('conv1', 'Hi');
    expect(component.isResponding()).toBe(false);
  });
});
