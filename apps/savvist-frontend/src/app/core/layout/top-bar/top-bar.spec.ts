import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Component, signal, WritableSignal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { TopBar } from './top-bar';
import { UserProfileDialog } from '../dialogs/user-profile-dialog/user-profile-dialog';
import { CreateEntryDialog } from '../dialogs/create-entry-dialog/create-entry-dialog';
import { UserService } from '../../services/user.service';

@Component({ template: '' })
class StubPage {}

describe('TopBar', () => {
  let component: TopBar;
  let fixture: ComponentFixture<TopBar>;
  let mockMatDialog: { open: ReturnType<typeof vi.fn> };
  let mockUserService: {
    user: WritableSignal<unknown>;
    isLoading: WritableSignal<boolean>;
    reload: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockMatDialog = {
      open: vi.fn().mockReturnValue({
        afterClosed: () => of(true),
      }),
    };

    mockUserService = {
      user: signal<unknown>(undefined),
      isLoading: signal(false),
      reload: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TopBar],
      providers: [
        provideRouter([
          { path: 'dashboard', title: 'Dashboard', component: StubPage },
        ]),
        { provide: MatDialog, useValue: mockMatDialog },
        { provide: UserService, useValue: mockUserService },
      ],
    })
      // TopBar imports MatDialogModule, which provides its own MatDialog at
      // the component level, so the provider above alone is not enough.
      .overrideProvider(MatDialog, { useValue: mockMatDialog })
      .compileComponents();

    fixture = TestBed.createComponent(TopBar);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe.each([
    ['openUserProfileDialog', UserProfileDialog],
    ['openAddEntryDialog', CreateEntryDialog],
  ] as const)('%s', (method, dialogComponent) => {
    // openAddEntryDialog is protected, so call it without type checks.
    const open = () =>
      (component as unknown as Record<string, () => void>)[method]();

    it('should open the dialog with the expected config', () => {
      open();

      expect(mockMatDialog.open).toHaveBeenCalledTimes(1);
      expect(mockMatDialog.open).toHaveBeenCalledWith(dialogComponent, {
        disableClose: true,
        width: '500px',
      });
    });

    it('should reload the user when the dialog closes with a truthy result', () => {
      open();

      expect(mockUserService.reload).toHaveBeenCalledTimes(1);
    });

    it.each([false, undefined, null])(
      'should not reload the user when the dialog closes with %s',
      (result) => {
        mockMatDialog.open.mockReturnValue({ afterClosed: () => of(result) });

        open();

        expect(mockUserService.reload).not.toHaveBeenCalled();
      },
    );
  });

  describe('pageTitle', () => {
    const pageTitle = () =>
      (component as unknown as { pageTitle: () => string }).pageTitle();

    it('should start with an empty title when no route has one', () => {
      expect(pageTitle()).toBe('');
    });

    it('should update the title after navigation', async () => {
      await TestBed.inject(Router).navigateByUrl('/dashboard');

      expect(pageTitle()).toBe('Dashboard');
    });
  });
});