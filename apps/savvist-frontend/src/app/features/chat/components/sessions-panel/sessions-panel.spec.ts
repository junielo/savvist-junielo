import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { SessionsPanel } from './sessions-panel';
import { ChatSession } from '../../models/chat-session';

describe('SessionsPanel', () => {
  let component: SessionsPanel;
  let fixture: ComponentFixture<SessionsPanel>;
  let mockMatDialog: { open: ReturnType<typeof vi.fn> };

  const mockSessions: ChatSession[] = [
    { id: '1', title: 'Session One' },
    { id: '2', title: 'Session Two' },
  ];

  beforeEach(async () => {
    mockMatDialog = {
      open: vi.fn().mockReturnValue({
        afterClosed: () => of(true),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [SessionsPanel],
      providers: [{ provide: MatDialog, useValue: mockMatDialog }],
    })
      .overrideProvider(MatDialog, { useValue: mockMatDialog })
      .compileComponents();

    fixture = TestBed.createComponent(SessionsPanel);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('sessions', mockSessions);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render session rows', () => {
    const rows = fixture.nativeElement.querySelectorAll('.session-row');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Session One');
    expect(rows[1].textContent).toContain('Session Two');
  });

  it('should show empty state when sessions array is empty', async () => {
    fixture.componentRef.setInput('sessions', []);
    fixture.detectChanges();
    await fixture.whenStable();

    const emptyEl = fixture.nativeElement.querySelector('.empty-state');
    expect(emptyEl).toBeTruthy();
    expect(emptyEl.textContent).toContain('No sessions yet');
  });

  it('should apply selected class and indicator when activeId matches', async () => {
    fixture.componentRef.setInput('activeId', '1');
    fixture.detectChanges();
    await fixture.whenStable();

    const rows = fixture.nativeElement.querySelectorAll('.session-row');
    expect(rows[0].classList.contains('selected')).toBe(true);
    expect(rows[0].getAttribute('aria-selected')).toBe('true');
    expect(rows[0].querySelector('.indicator-icon')).toBeTruthy();

    expect(rows[1].classList.contains('selected')).toBe(false);
    expect(rows[1].getAttribute('aria-selected')).toBe('false');
    expect(rows[1].querySelector('.indicator-icon')).toBeFalsy();
  });

  it('should emit select output on row click', () => {
    const selectSpy = vi.fn();
    component.select.subscribe(selectSpy);

    const rows = fixture.nativeElement.querySelectorAll('.session-row');
    rows[1].click();

    expect(selectSpy).toHaveBeenCalledWith('2');
  });

  it('should emit create output on add button click', () => {
    const createSpy = vi.fn();
    component.create.subscribe(createSpy);

    const addButton = fixture.nativeElement.querySelector('button[aria-label="New session"]');
    addButton.click();

    expect(createSpy).toHaveBeenCalled();
  });

  it('should disable edit and delete buttons when no activeId', () => {
    const editBtn = fixture.nativeElement.querySelector('button[aria-label="Rename session"]');
    const deleteBtn = fixture.nativeElement.querySelector('button[aria-label="Delete session"]');

    expect(editBtn.disabled).toBe(true);
    expect(deleteBtn.disabled).toBe(true);
  });

  it('should enable edit and delete buttons when activeId is present', async () => {
    fixture.componentRef.setInput('activeId', '1');
    fixture.detectChanges();
    await fixture.whenStable();

    const editBtn = fixture.nativeElement.querySelector('button[aria-label="Rename session"]');
    const deleteBtn = fixture.nativeElement.querySelector('button[aria-label="Delete session"]');

    expect(editBtn.disabled).toBe(false);
    expect(deleteBtn.disabled).toBe(false);
  });

  it('should open confirmation dialog and emit remove on confirmation', async () => {
    fixture.componentRef.setInput('activeId', '1');
    fixture.detectChanges();
    await fixture.whenStable();

    const removeSpy = vi.fn();
    component.remove.subscribe(removeSpy);

    const deleteBtn = fixture.nativeElement.querySelector('button[aria-label="Delete session"]');
    deleteBtn.click();
    await fixture.whenStable();

    expect(mockMatDialog.open).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith('1');
  });

  it('should not emit remove if dialog is cancelled', async () => {
    mockMatDialog.open.mockReturnValue({
      afterClosed: () => of(false),
    });

    fixture.componentRef.setInput('activeId', '1');
    fixture.detectChanges();
    await fixture.whenStable();

    const removeSpy = vi.fn();
    component.remove.subscribe(removeSpy);

    const deleteBtn = fixture.nativeElement.querySelector('button[aria-label="Delete session"]');
    deleteBtn.click();
    await fixture.whenStable();

    expect(removeSpy).not.toHaveBeenCalled();
  });
});
