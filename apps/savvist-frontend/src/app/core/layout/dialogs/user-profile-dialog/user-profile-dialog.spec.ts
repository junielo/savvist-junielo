import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserProfileDialog } from './user-profile-dialog';
import { UserService } from '../../../services/user.service';

describe('UserProfileDialog', () => {
  let component: UserProfileDialog;
  let fixture: ComponentFixture<UserProfileDialog>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockUserService: { user: ReturnType<typeof vi.fn>; updateUser: ReturnType<typeof vi.fn> };
  let mockSnackBar: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };
    mockUserService = {
      user: vi.fn().mockReturnValue({
        id: '1',
        displayName: 'John Doe',
        baseSalary: 30000,
        salaryDay1: 15,
        salaryDay2: 30,
        isUnemployed: false,
        currency: 'PHP',
        locale: 'en-PH',
        timeZone: 'Asia/Manila',
      }),
      updateUser: vi.fn().mockResolvedValue({}),
    };
    mockSnackBar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [UserProfileDialog],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: UserService, useValue: mockUserService },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserProfileDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with user values', () => {
    const formValue = component['profileForm'].value;
    expect(formValue).toEqual({
      fullName: 'John Doe',
      baseSalary: 30000,
      firstPayday: 15,
      secondPayday: 30,
      currentlyUnemployed: false,
    });
  });

  it('should close dialog on close()', () => {
    component['close']();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });
});
