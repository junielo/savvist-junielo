import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { ChatPage } from './chat-page';

describe('ChatPage', () => {
  let component: ChatPage;
  let fixture: ComponentFixture<ChatPage>;
  let mockMatDialog: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockMatDialog = {
      open: vi.fn().mockReturnValue({
        afterClosed: () => of(true),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [ChatPage],
      providers: [{ provide: MatDialog, useValue: mockMatDialog }],
    })
      .overrideProvider(MatDialog, { useValue: mockMatDialog })
      .compileComponents();

    fixture = TestBed.createComponent(ChatPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should select the first session on load', () => {
    expect(component.activeId()).toBeTruthy();
    expect(component.activeMessages().length).toBeGreaterThan(0);
  });

  it('should switch sessions and change the thread messages', () => {
    const sessions = component.sessions();
    expect(sessions.length).toBeGreaterThan(1);
    const secondSessionId = sessions[1].id;

    // Call onSelectSession
    component['onSelectSession'](secondSessionId);
    expect(component.activeId()).toBe(secondSessionId);
    expect(component.activeMessages()).toEqual(component.messagesBySession()[secondSessionId]);
  });

  it('should add a new session at the top and select it', () => {
    const initialCount = component.sessions().length;
    component['onCreateSession']();

    expect(component.sessions().length).toBe(initialCount + 1);
    expect(component.sessions()[0].title).toBe('New chat');
    expect(component.activeId()).toBe(component.sessions()[0].id);
    expect(component.activeMessages()).toEqual([]);
  });

  it('should rename an existing session', () => {
    const targetId = component.sessions()[0].id;
    component['onRenameSession']({ id: targetId, title: 'Updated Session Title' });

    const renamed = component.sessions().find((s) => s.id === targetId);
    expect(renamed?.title).toBe('Updated Session Title');
  });

  it('should delete a session and fallback to active session or null', () => {
    const sessionsBefore = component.sessions();
    expect(sessionsBefore.length).toBeGreaterThan(0);

    const firstId = sessionsBefore[0].id;
    component.activeId.set(firstId);

    component['onRemoveSession'](firstId);

    expect(component.sessions().find((s) => s.id === firstId)).toBeUndefined();
    // Active should fall back to next session or null
    if (component.sessions().length > 0) {
      expect(component.activeId()).toBe(component.sessions()[0].id);
    } else {
      expect(component.activeId()).toBeNull();
    }
  });

  it('should handle sending a message and appending canned assistant reply after timeout', async () => {
    vi.useFakeTimers();
    const activeId = component.activeId();
    expect(activeId).toBeTruthy();

    const initialMessageCount = component.activeMessages().length;

    component['onSendMessage']('Hello assistant');

    // User message appended immediately
    expect(component.activeMessages().length).toBe(initialMessageCount + 1);
    expect(component.activeMessages()[component.activeMessages().length - 1].role).toBe('user');
    expect(component.isResponding()).toBe(true);

    // Fast-forward timers
    vi.advanceTimersByTime(600);

    // Assistant reply appended
    expect(component.activeMessages().length).toBe(initialMessageCount + 2);
    expect(component.activeMessages()[component.activeMessages().length - 1].role).toBe('assistant');
    expect(component.isResponding()).toBe(false);

    vi.useRealTimers();
  });

  it('should show empty state when no session is selected', () => {
    component.activeId.set(null);
    fixture.detectChanges();

    expect(component.activeMessages()).toEqual([]);
    expect(component.isComposerDisabled()).toBe(true);
  });
});
