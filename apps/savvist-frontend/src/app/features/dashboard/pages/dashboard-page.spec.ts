import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DashboardPage } from './dashboard-page';
import { UserService } from '../../../core/services/user.service';

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;
  let mockUserService: { user: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockUserService = {
      user: vi.fn().mockReturnValue({
        id: '1',
        displayName: 'John Doe',
        baseSalary: 30000,
        isUnemployed: false,
        currency: 'PHP',
        locale: 'en-PH',
        timeZone: 'Asia/Manila',
      }),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        { provide: UserService, useValue: mockUserService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the user name in the top left', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const userNameEl = compiled.querySelector('.user-name');
    expect(userNameEl).toBeTruthy();
    expect(userNameEl?.textContent?.trim()).toContain('John Doe');
  });

  it('should render three card-computed-amount and two apex-gauge-label components', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('app-card-computed-amount');
    const gauges = compiled.querySelectorAll('app-apex-gauge-label');
    expect(cards.length).toBe(3);
    expect(gauges.length).toBe(2);
  });
});
